# Trust, privacy, and safety at Precedent

Precedent's entire dataset is other people's biographies. This document records
what we do about that — as implemented, not as aspiration. Each section names the
code that enforces it, so a claim here can be checked rather than taken on faith.

It doubles as the user-facing trust page (`/trust`).

---

## 1. Nothing here is scraped

Every pathway on Precedent was submitted by the person it describes, or by
someone with documented permission from them.

There is no importer that ingests LinkedIn profiles, no crawler, and no
"claim your profile" flow built on data collected without the subject's action.
Growth comes from invite flows, not from crawling.

**Where this lives:** the only write path into the index is `POST /pathways`
(`services/api/src/server.ts`), which validates against the `Pathway` schema and
requires an authoring account. There is no bulk import endpoint.

## 2. You choose what is public, field by field

Name, institution, employer, compensation band, location precision, graduation
year precision, GPA band, and background tags are each independently
controllable.

Defaults are privacy-preserving where a field is identifying. **Compensation
defaults to private** — it is the field most often shared without thinking
through the consequences.

Two implementation details matter more than the setting itself:

- Redaction **deletes** keys rather than nulling them. A key present with a null
  value still tells an observer that the field exists and was withheld.
- Location is rendered at your chosen precision *before* serialization. Choosing
  "country only" removes the city from the response; it does not merely hide it
  in the client.

**Where this lives:** `packages/core/src/privacy.ts`. `toPublicPathway()` is the
only sanctioned way to turn a stored pathway into something a viewer, a share
card, or the search index can see, and it returns a distinct `PublicPathway`
type — so a function that accepts public data cannot be handed private data by
mistake.

## 3. Pseudonymity survives verification

A pseudonymous pathway can still reach `source-linked` or
`institution-verified`. Checks run against your real identity; only the resulting
badge is displayed.

Your real name is held for verification alone. It is never serialized to any
viewer, share card, or search document, at any tier.

**Where this lives:** `realName` exists on the stored `Pathway` and has no
counterpart on `PublicPathway`. Three independent layers enforce this: the type
boundary, a runtime response guard in the API that aborts a request rather than
shipping a leak, and a test that sweeps every seeded pathway for private values
in every response (`services/api/test/api.test.js`).

## 4. Contact is a relay, and you control it

Contactability is opt-in per pathway, revocable, and never exposes an email
address.

- Messages route through a rate-limited relay. The default is 3 inbound messages
  per week, enforced server-side.
- A contact request must carry context. Blank outreach is rejected.
- You can mute or sever a thread individually, or shut off contact globally.
- The relay address is never serialized under any tier or contact state.

**Where this lives:** `ContactPreferences` in `packages/core/src/pathway.ts`;
`ContactThread` / `ContactMessage` in the Prisma schema; the API test asserts the
relay address is absent from profile responses while contactability is still
advertised.

## 5. Deletion is real deletion

One tap exports your pathway as JSON. One tap deletes it.

Deletion removes the row, the search document, and the cache entry, and the
pathway stops appearing in "similar pathways" everywhere. Deleted pathways do not
linger as tombstones in the index.

The single record that survives is a `DeletionReceipt`, which holds **no
biography** — only the pathway id and the timestamps proving the index and cache
purges completed. It exists so an erasure can be audited.

**Where this lives:** `deletePathway()` in `services/api/src/store.ts`;
`onDelete: Cascade` on every child table in `prisma/schema.prisma`, asserted by
`packages/core/test/schema-parity.test.js`. The API test deletes a pathway and
then checks every other profile to confirm it is gone from similar-pathway
results.

## 6. Background tags are self-declared, never inferred

Nothing in this codebase derives a demographic attribute from a name,
institution, photo, or writing style, and no model is trained to guess one.

Background tags are optional, explicitly labelled as self-reported, and can be
hidden from the public view independently of everything else.

**Where this lives:** `BACKGROUND_TAGS` in `packages/core/src/taxonomy/types.ts`,
populated only from submitter input. There is no inference code path.

## 7. Minors

Reading Precedent is open to everyone — a 15-year-old researching whether
community college forecloses a top university is exactly who this is for.

Submitting a personal pathway is gated:

| Age | Can browse | Can submit |
|---|---|---|
| Under 16 | Yes | No |
| 16–17 | Yes | Only with verified parental consent |
| 18+ | Yes | Yes |

Withdrawing consent unpublishes the pathway immediately — a 16–17 pathway is
publicly visible only while consent is actively granted.

**Where this lives:** `packages/core/src/consent.ts`. Guardian contact is stored
hashed, never in the clear.

## 8. Compensation is always a band

Precedent cannot represent an exact salary figure — the type system only permits
a band. This reduces the doxxing surface and keeps submitters clear of employer
pay-disclosure clauses.

**Where this lives:** `CompensationBand` in `packages/core/src/primitives.ts`.

## 9. Employer and institution names, reporting, and takedown

Employer and institution names are published as submitted, because a pathway
without them is substantially less useful. Alongside that:

- Compensation stays banded regardless.
- Every profile carries a report route for impersonation, misrepresentation,
  fabrication, and privacy complaints.
- A setback step naming an employer is flagged for review before publication,
  since that is where defamation risk concentrates.
- Takedown requests are worked in the same queue as reports.

**Where this lives:** `Report` and `ReviewLogEntry` in the Prisma schema;
`moderationState` gates publication.

## 10. Anti-fabrication

The index's value collapses the moment it fills with invented pathways.

- Submissions are rate-limited per account.
- A pathway must reach at least `self-attested` before it can rank in the default
  sort. Unverified content is still searchable and still shown — it is ranked
  lower and badged, never hidden.
- The moderation queue is risk-ranked, and **high detail with no verification**
  scores as elevated risk, because that combination is the signature of
  fabricated content.
- Verification signals expire. `source-linked` signals are re-checked annually,
  and an expired signal automatically demotes the tier.

**Where this lives:** `canRankInDefaultSort()` and `deriveTier()` in
`packages/core/src/verification.ts`; the risk ranking in `/admin/queue`.

---

## What verification actually means

Each tier has one meaning, shown to users verbatim from a single source
(`packages/ui-tokens/src/verification.ts`) so it says the same thing everywhere.

| Tier | What it means | How it is earned |
|---|---|---|
| **Unverified** | Submitted, nothing checked. | Default on submission. |
| **Self-attested** | The author confirmed their identity to us. The content itself is unchecked. | A registered account plus an explicit attestation. |
| **Source-linked** | At least one claim is corroborated by an external source. | LinkedIn OAuth identity match, public profile URL, or verifiable credential link. |
| **Institution-verified** | An institution or employer email domain was confirmed for a claimed step. | `.edu` / employer domain challenge, or manual review of an uploaded credential. |

Two things follow from how this is built:

- **Verification attaches to claims, not to people.** A pathway can hold an
  institution-verified education step next to an unverified compensation figure,
  and the profile shows it at that granularity.
- **The tier is derived, never assigned.** It is always a function of the signals
  actually present, so it cannot drift away from the evidence, and an expiring
  signal demotes the pathway automatically.

The verification panel on every profile lists each signal, what it corroborates,
and the date it was checked. There is deliberately no single opaque checkmark.

---

## No engagement mechanics

There are no likes, no streaks, no infinite scroll, and no notifications designed
to pull you back. Saved-search alerts are opt-in, email-only, and capped at a
weekly digest.

Ranking never uses engagement. View and save counts exist for a submitter's own
view and for abuse detection, and they are structurally absent from the search
document so they cannot leak into scoring — asserted by a test in
`packages/search/test/search.test.js`.

Ranking order is: exact transition match → verification tier → completeness →
similarity to your declared starting point → recency.

---

## Reporting something

Every profile has a report control covering impersonation, misrepresentation,
fabrication, and privacy concerns. Reports are worked by a human reviewer, and
reported pathways jump the queue.
