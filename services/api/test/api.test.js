/**
 * API-level guarantees.
 *
 * These exercise the real HTTP surface, because the checklist items they cover
 * ("anonymous pathway never leaks through API responses", "delete propagates to
 * index and caches") are properties of the response, not of a pure function.
 */

import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';

import { privateValuesOf } from '@precedent/core';

import { createApiServer, store } from '../dist/server.js';

let baseUrl;
let server;

before(async () => {
  server = createApiServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = async (path) => {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
};

test('health reports the seeded corpus', async () => {
  const { status, body } = await get('/health');
  assert.equal(status, 200);
  assert.equal(body.pathways, 40);
  assert.equal(body.transitions, 10, 'seed must cover 10 distinct transitions');
});

test('search returns results with live facet counts', async () => {
  const { status, body } = await get('/search');
  assert.equal(status, 200);
  assert.equal(body.total, 40);
  assert.equal(body.results.length, 20, 'first page');
  assert.ok(body.facets.verificationTier.length > 0);

  const tierTotal = body.facets.verificationTier.reduce((s, f) => s + f.count, 0);
  assert.equal(tierTotal, 40, 'every pathway lands in exactly one tier facet');
});

test('filters applied via query string narrow the result set', async () => {
  const { body } = await get('/search?to=dental-school');
  assert.ok(body.total > 0);
  for (const doc of body.results) assert.equal(doc.toId, 'dental-school');
});

test('an empty result set returns adjacent transitions', async () => {
  const { body } = await get('/search?from=electrical-engineering&to=law-school');
  assert.equal(body.total, 0);
  assert.ok(body.adjacent.length > 0, 'the empty state must offer real alternatives');
});

test('no API response leaks a private field of any seeded pathway', async () => {
  // Sweep the whole corpus rather than a sample: one unredacted field on one
  // pathway is a breach.
  const { body: searchBody } = await get('/search?page=1');
  const { body: searchBody2 } = await get('/search?page=2');
  const serializedSearch = JSON.stringify([searchBody, searchBody2]);

  for (const doc of store.listDocs()) {
    const full = store.getPathway(doc.id);
    for (const secret of privateValuesOf(full)) {
      assert.ok(
        !serializedSearch.includes(secret),
        `search results leaked "${secret}" from ${doc.id}`,
      );
    }

    const { body: profile } = await get(`/pathways/${doc.id}`);
    const serializedProfile = JSON.stringify(profile);
    for (const secret of privateValuesOf(full)) {
      assert.ok(
        !serializedProfile.includes(secret),
        `profile ${doc.id} leaked "${secret}"`,
      );
    }
  }
});

test('an anonymous profile shows the pseudonym and never the real name', async () => {
  const anonymous = store
    .listDocs()
    .map((d) => store.getPathway(d.id))
    .find((p) => p.person.isAnonymous);
  assert.ok(anonymous, 'seed must contain anonymous pathways');

  const { body } = await get(`/pathways/${anonymous.id}`);
  assert.equal(body.pathway.person.displayName, anonymous.person.pseudonym);
  assert.equal(body.pathway.person.isAnonymous, true);
  assert.equal('realName' in body.pathway.person, false);
});

test('the relay address never appears in a profile response', async () => {
  const contactable = store
    .listDocs()
    .map((d) => store.getPathway(d.id))
    .find((p) => p.contact.isOpen);
  assert.ok(contactable);

  const { body } = await get(`/pathways/${contactable.id}`);
  assert.equal(body.pathway.contact.isOpen, true, 'contactability is still advertised');
  assert.equal('relayAddress' in body.pathway.contact, false, 'but never the address');
});

test('a profile carries its completeness breakdown, not just a score', async () => {
  const id = store.listDocs()[0].id;
  const { body } = await get(`/pathways/${id}`);
  assert.ok(typeof body.completeness.score === 'number');
  assert.ok(body.completeness.components.length > 0);
  assert.ok(body.completeness.components.every((c) => c.hint));
});

test('natural-language parse returns an editable interpretation', async () => {
  const { body } = await get('/parse?q=' + encodeURIComponent("I'm an EE major who wants to do dentistry"));
  assert.equal(body.filters.from, 'electrical-engineering');
  assert.equal(body.filters.to, 'dental-school');
  assert.ok(body.interpretation.length >= 2, 'the parse must be shown to the user');
});

test('taxonomy typeahead collapses synonyms onto canonical nodes', async () => {
  const { body } = await get('/taxonomy?q=ece&kind=major');
  assert.ok(body.nodes.some((n) => n.id === 'electrical-engineering'));
});

test('compare requires at least two pathways', async () => {
  const ids = store.listDocs().slice(0, 2).map((d) => d.id);
  const { status: bad } = await get(`/compare?ids=${ids[0]}`);
  assert.equal(bad, 400);

  const { status, body } = await get(`/compare?ids=${ids.join(',')}`);
  assert.equal(status, 200);
  assert.equal(body.pathways.length, 2);
});

test('deleting a pathway propagates to the index, caches, and similar results', async () => {
  const victim = store.listDocs().find((d) => d.toId === 'dental-school');
  assert.ok(victim);
  const id = victim.id;

  const res = await fetch(`${baseUrl}/pathways/${id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const { receipt } = await res.json();
  assert.ok(receipt.indexPurgedAt, 'index purge must be recorded');
  assert.ok(receipt.cachePurgedAt, 'cache purge must be recorded');
  assert.ok(receipt.completedAt);

  // Gone from the index.
  const { body: searched } = await get('/search?to=dental-school');
  assert.ok(!searched.results.some((d) => d.id === id), 'deleted pathway still in search');

  // Gone from similar-pathway results everywhere.
  for (const doc of store.listDocs()) {
    const { body } = await get(`/pathways/${doc.id}`);
    assert.ok(
      !body.similar?.some((s) => s.id === id),
      `deleted pathway still surfaced as similar on ${doc.id}`,
    );
  }

  // The profile itself is gone, and says so honestly.
  const { status } = await get(`/pathways/${id}`);
  assert.equal(status, 410);
});

test('submitting an invalid pathway returns field-level errors', async () => {
  const res = await fetch(`${baseUrl}/pathways`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'nope', steps: [] }),
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, 'validation_failed');
  assert.ok(body.issues.length > 0);
  assert.ok(body.issues.every((i) => Array.isArray(i.path)));
});

test('the moderation queue is risk-ranked for a single reviewer', async () => {
  const { body } = await get('/admin/queue');
  assert.ok(body.items.length > 0);
  for (let i = 1; i < body.items.length; i += 1) {
    assert.ok(body.items[i - 1].risk >= body.items[i].risk, 'queue must be risk-ordered');
  }
  // Unverified content should be surfaced for review, not silently trusted.
  assert.ok(body.items.some((i) => i.tier === 'unverified'));
});
