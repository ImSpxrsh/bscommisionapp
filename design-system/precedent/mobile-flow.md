# Precedent mobile — screen-by-screen flow

Spec for the Expo app in `apps/mobile` (not yet built). Written against the
domain model in `packages/core`, the shared search/filter logic in
`packages/search`, and the privacy decisions in `TRUST.md`. Where this document
and `TRUST.md` disagree, `TRUST.md` wins.

Visual rules come from `design-system/precedent/MASTER.md` and
`design-system/OVERRIDES.md`. Colour, spacing, type, and motion resolve through
`buildNativeTheme()` in `packages/ui-tokens` — the mobile app never writes a hex,
a font size, or a duration of its own.

---

## The one thing this flow gets right

**Reading is not gated.** A first-time user reaches a real pathway without an
account, without onboarding, and without a permission prompt. That is not a
growth tactic — it is the product thesis. A 15-year-old asking whether community
college forecloses a top university is exactly the intended reader, and they
cannot legally submit (`TRUST.md` §7) but should never be blocked from reading.

So the account, the age gate, and every permission request are **deferred to the
first moment they are actually required**:

| Action | Account needed? |
|---|---|
| Search, read a pathway, compare, filter | No |
| Save a pathway, set up a search alert | Yes |
| Contact a submitter | Yes |
| Submit your own pathway | Yes, and 16+ (16–17 needs verified parental consent) |

Everything below follows from that.

---

## Flow map

```
Splash
  └─> Welcome ──skip──────────────────────┐
        └─> Onboarding 1 ─> 2 ─> 3 ───────┤
                                          v
                                        Home  <──────────────┐
                                          │                   │
                          ┌───────────────┼───────────────┐   │
                          v               v               v   │
                      Results         Saved           Settings│
                          │                                   │
                    ┌─────┴─────┐                             │
                    v           v                             │
                Filters    Pathway profile ──> Step detail     │
                                │                             │
                    ┌───────────┼───────────┐                 │
                    v           v           v                 │
                Compare    Contact      Save ─────────────────┘
                                │
                        (account gate) ─> Sign in ─> back to intent

Submit  ──> Age gate ──> [16–17] Parental consent ──> Wizard 1..5 ──> Success
```

Rule: **every gate returns the user to the thing they were trying to do.** A
sign-in triggered by tapping Save ends on the pathway with the save completed,
never on Home.

---

## 1. Splash

| | |
|---|---|
| **Screen name** | `Splash` |
| **Purpose** | Cover the cold-start hydration of the token theme and the seeded taxonomy. Nothing else. |

**Main content.** Wordmark centred on `color.pageBg`. No tagline, no spinner for
the first 400ms — a spinner that appears and vanishes reads as a stutter.

**Buttons/actions.** None. Not tappable.

**What happens.** Auto-advances as soon as the theme resolves. First launch →
`Welcome`. Every later launch → `Home`. If a draft submission exists in local
storage, still go to `Home`; the draft is surfaced there as a card, not as a
hijacked launch.

**Layout.** Single centred wordmark, optically centred (~46% of height, not 50%).
Respects `prefers-reduced-motion`: fade in only, no scale.

**Microcopy.** Wordmark only. If loading exceeds 3s: `Still loading. Check your
connection.`

---

## 2. Welcome

| | |
|---|---|
| **Screen name** | `Welcome` |
| **Purpose** | Say what this is in one sentence and get out of the way. |

**Main content.** The product question as the headline, one clarifying line, and
a single real example pathway rendered as a sequence ribbon — showing the actual
artefact rather than describing it.

**Buttons/actions.**
- **Primary:** `Show me how it works` → `Onboarding 1`
- **Text link:** `Skip — take me to search` → `Home`

**What happens.** Either path sets `hasLaunched = true`, so this screen is never
shown again. Skipping is not penalised: nothing later in the app assumes
onboarding was seen.

**Layout.** Headline at `fontSize.2xl`, capped at three lines. Example ribbon with
its legend beneath. Buttons pinned to the bottom safe area, primary above the
text link.

**Microcopy.**
> **Has someone already done what you are trying to do?**
> Precedent indexes real transitions and the exact steps each person took —
> including the parts that did not work.
>
> `Show me how it works`   `Skip — take me to search`

---

## 3. Onboarding (3 screens, skippable throughout)

Three screens, each with `Skip` in the top-right. Screen 3 is the only one that
asks for anything, and what it asks for does real work.

### 3a. `Onboarding — What is indexed`

**Purpose.** Set the expectation that a pathway is a *sequence*, not a profile.

**Main content.** One pathway's ribbon animating segment by segment (~600ms
total, instant under reduced motion), with step labels resolving beneath.

**Actions.** `Next` → 3b. `Skip` → `Home`.

**Microcopy.**
> **Every route, step by step.**
> Not a profile. The order someone did things in, how long each part took, and
> what it cost them.

### 3b. `Onboarding — Setbacks are part of the record`

**Purpose.** Pre-empt the assumption that this is a highlight reel. This is the
screen that differentiates the product, so it gets its own beat.

**Main content.** The same ribbon, now with the setback segment called out —
recessed grey, annotated `8 months, no callbacks`.

**Actions.** `Next` → 3c. `Skip` → `Home`.

**Microcopy.**
> **Including the parts that did not work.**
> Rejections, stalls, and pivots are recorded as steps. A pathway with no
> friction recorded is marked incomplete, not clean.

### 3c. `Onboarding — Where are you now?`

**Purpose.** Collect the viewer's starting point. This is not a preference
screen: declared starting point feeds the *similarity* term in ranking (`TRUST.md`,
"No engagement mechanics"), so answering measurably improves results.

**Main content.** Two optional typeahead fields (`Field of study or work`,
`Where you want to go`) over the taxonomy, plus an optional multi-select of
background tags from `BACKGROUND_TAGS`.

**Actions.**
- **Primary:** `Save and search` → `Home`, fields pre-filled
- **Text link:** `Not sure yet` → `Home`, nothing stored

**What happens.** Stored **on device only** until an account exists. Background
tags are self-declared and never inferred (`TRUST.md` §6) — the screen says so.

**Layout.** Two stacked typeaheads, tag chips in a wrapping grid below, buttons
pinned bottom.

**Microcopy.**
> **Where are you starting from?**
> This ranks routes by how close they are to your situation. Optional, editable
> later, and never shown on your profile.
>
> Helper under tags: `Self-declared only. We never infer these.`

---

## 4. Sign up / sign in

Reached **only** from a gated action, never from a launch wall. The screen always
states which action triggered it.

### 4a. `Sign in`

**Purpose.** Establish an account with the least data possible.

**Main content.** Email field and a one-line explanation of why sign-in appeared
now. Email link (magic link) is the primary method — no password to store, leak,
or reset.

**Buttons/actions.**
- **Primary:** `Email me a sign-in link` → sends, advances to `Check your email`
- **Text link:** `Why do I need an account?` → bottom sheet explaining that saves,
  alerts, contact, and submissions are tied to an account and nothing else is

**What happens on tap.** On success → `Check your email`. On unknown email, the
same screen and the same copy — the app must not disclose whether an address is
registered. Opening the link returns to **the exact screen and intent** that
triggered sign-in, with the pending action completed.

**Layout.** Contextual title, single field, primary button, explanation link. No
social sign-in: an OAuth provider would learn what someone is researching, which
is the one thing this product must not leak.

**Microcopy.**
> **Sign in to save this pathway.** *(or `…to contact this submitter`, `…to add
> your pathway`)*
> We use a sign-in link, so there is no password to remember.
>
> Sent state: `Check your email — we sent a link to name@example.com. The link
> expires in 15 minutes.`

### 4b. `Age gate` (submission only)

**Purpose.** Enforce `TRUST.md` §7 before any pathway data is entered.

**Main content.** Date-of-birth entry, with a plain statement of the rule.

**Actions.** `Continue` → 18+: wizard. 16–17: `Parental consent`. Under 16:
`Under-16` screen.

**Microcopy.**
> **How old are you?**
> Reading Precedent is open to everyone. Adding your own pathway needs you to be
> 16 or older, and 16–17 needs a parent or guardian's consent.

### 4c. `Under-16` (a redirect, not a rejection)

**Purpose.** Turn a blocked action into a usable one. This screen must not read
as a door slam.

**Actions.** `Keep exploring` → `Home`. `Remind me when I turn 16` → stores the
date locally only.

**Microcopy.**
> **You can read everything here.**
> Adding your own pathway needs you to be 16. Nothing else on Precedent is closed
> to you — search, compare, and save all work.

### 4d. `Parental consent` (16–17)

**Purpose.** Capture verified guardian consent. Guardian contact is stored
**hashed, never in the clear** (`TRUST.md` §7).

**Main content.** Guardian email field, an explanation of what the guardian is
consenting to, and a statement that consent is revocable.

**Actions.** `Send consent request` → `Awaiting consent`. The wizard is usable
meanwhile — the draft simply cannot publish until consent lands.

**Microcopy.**
> **We need a parent or guardian to confirm.**
> They will get one email describing exactly what gets published. You can write
> your pathway now; it stays private until they confirm.
>
> `Consent can be withdrawn at any time, which unpublishes the pathway
> immediately.`

---

## 5. Home

| | |
|---|---|
| **Screen name** | `Home` |
| **Purpose** | Start a search. The search field *is* the call to action. |

**Main content, top to bottom.**
1. Search entry — `From` and `To` typeaheads, plus a `Describe it` free-text field
2. `Resume draft` card, only if a submission draft exists
3. `In the index right now` — 6 real pathways, each a row with ribbon, tier badge,
   duration, step count
4. Corpus line: `40 pathways across 10 transitions.`

There is **no feed**. Nothing on this screen updates to pull the user back, and
nothing is ranked by popularity.

**Buttons/actions.**
- `From` / `To` typeahead → taxonomy suggestions; free text always accepted
- `Search` → `Results`
- `Describe it` → deterministic parse → `Results` with the interpretation shown as
  editable chips (never a silent rewrite)
- Any index row → `Pathway profile`
- Tab bar: `Search` · `Saved` · `Add` · `Settings`

**What happens on tap.** `Search` with both endpoints runs an exact transition
match. With one endpoint, it runs a broader match on that endpoint. With neither
but with free text, it runs the parser and shows what it understood before the
results, so an empty result set is always explainable.

**Layout.** Search card at top on `color.surface` with a hairline border. Index
rows are hairline-separated, two lines each: transition + badge, then ribbon.
Tab bar has 4 items; `Add` is a labelled item, not a floating button.

**Microcopy.**
> Placeholders: `e.g. Electrical Engineering` / `e.g. Dental School`
> Free text: `I'm an EE major who wants to do dentistry`
> Section head: `IN THE INDEX RIGHT NOW`

---

## 6. Main feature screens

### 6a. `Results`

**Purpose.** Let someone scan many routes quickly and tell them apart.

**Main content.** Result count, sort control, applied-filter chips, the legend,
then the result list. Each card: transition line, tier badge, **sequence ribbon**,
duration · steps · obstacles · completeness, constraint chips, and the outcome in
primary ink — the outcome is the payload of the card.

**Buttons/actions.**
- `Filters` (shows active count) → `Filters` sheet
- `Sort` → action sheet: Relevance · Most recent · Shortest duration · Highest
  verification
- Filter chip `×` → removes that one facet, re-runs immediately
- Card tap → `Pathway profile`
- Card long-press → `Add to comparison`

**What happens on tap.** Filter state lives in the URL/deep-link parameters via
`filtersToQueryString`, so a shared link opens the identical result set on web —
that property only holds because the codec is shared, and mobile must use it
rather than rolling its own.

**Layout.** Sticky header (count + sort + filter). Legend once, directly under the
header, not per card. Cards hairline-bordered on `color.surface`, 8px apart.
Hover/press is a background wash, never a lift.

**Microcopy.**
> `4 pathways` · `Sorted by relevance` · `Filters (2)`

### 6b. `Filters` (bottom sheet)

**Purpose.** Narrow results without losing sight of them.

**Main content.** Grouped facets with live counts: Availability, Verification,
Transition type, Starting constraints, Background, Major, Institution, Location,
Graduation year.

**Buttons/actions.** Checkbox → stages the change. `Show N pathways` → applies and
dismisses. `Clear all` → resets. Swipe down → dismisses without applying.

**What happens.** Counts recompute as facets are staged. Selecting inside a facet
never collapses that facet's own sibling options — guarded by a test in
`packages/search`.

**Layout.** Sheet at ~90% height, sticky `Show N pathways` footer, sections with
counts right-aligned in tabular figures.

**Microcopy.**
> `Show 12 pathways` · `Clear all` · Zero state: `No pathways match all of these.
> Try removing a filter.`

### 6c. `Pathway profile`

**Purpose.** The full record. This is what the whole app exists to deliver.

**Main content, in order.**
1. Header: transition, tier badge, duration, step count, submitter name, and the
   sequence ribbon as a minimap
2. `Starting conditions` — institution, major, GPA band, graduation year,
   location, constraint chips
3. `The sequence` — the ordered timeline, each step with family colour, icon,
   label, dates, duration, expandable detail, and its obstacle if recorded
4. `Outcome` — result and compensation **band** (never an exact figure)
5. `Reflection` — would repeat / would skip / biggest obstacle / what was luck
6. `Verification` — every signal, what was checked, and when
7. `Completeness` — the scored breakdown, not just a number
8. `Adjacent pathways`

**Buttons/actions.**
- `Expand all steps` → expands every step detail
- Step row → `Step detail`
- `Save` → account gate if needed, then saves
- `Compare` → adds to the comparison tray
- `Contact` → account gate, then `Contact request`; disabled and labelled `Not
  open to contact` when contact is off
- `Report` (overflow) → `Report`

**What happens on tap.** `Verification` rows are tappable and explain that the
tier is *derived from the signals present*, never assigned — and that an expiring
signal demotes the pathway automatically.

**Layout.** Single column. The timeline uses a left rule with family-coloured step
markers. Setback steps render on `color.surfaceSunken` with a neutral rule — never
red, which stays reserved for destructive actions.

**Microcopy.**
> No-friction warning: `This pathway records no obstacles or setbacks. That
> usually means it is incomplete rather than that the route was frictionless.`
> Compensation: `Band: $80k–$100k` with helper `Precedent never stores exact pay.`

### 6d. `Step detail`

**Purpose.** One step in full, including what went wrong.

**Main content.** Type, title, dates, duration, the author's own description in
the text face, the obstacle if any, evidence attached, and its verification state.

**Actions.** `Next step` / `Previous step`, `Close`.

**Microcopy.** Section head `What made this hard` — shown only when an obstacle
exists; never a stub.

### 6e. `Compare`

**Purpose.** Put two or three routes on a shared, normalised time axis.

**Main content.** Year axis where t=0 is each pathway's *own* start, then one
lane-packed row per pathway, then a `Where these routes differ` summary.

**Actions.** `Add pathway` → picker (max 3). `Remove`. Tap a bar → that step's
detail. Horizontal scroll for long routes.

**What happens.** Steps pack into the fewest non-overlapping lanes, so a
sequential route is one row and a second row appears only where two steps
genuinely overlapped.

**Microcopy.**
> `Each row starts at that person's own month zero, so the routes are comparable
> regardless of when they happened.`
> Picker: `Choose at least two pathways to compare.`

### 6f. `Submit wizard` (5 stages)

**Purpose.** Capture a pathway with enough structure to be useful, and enough
friction to be honest.

**Stages.** 1 Transition · 2 Starting conditions · 3 The sequence · 4 Outcome ·
5 Review.

**Main content per stage.** Stage 3 is the substance: add steps, set type from the
14 step types, dates, title, detail, and obstacle. `setback` and `pivot` are
first-class types offered in the same picker as the rest.

**Buttons/actions.** `Back` / `Continue`, `Add step`, reorder, delete, `Save
draft` (automatic), `Publish` on stage 5.

**What happens on tap.** **The obstacle gate:** if zero obstacles are recorded,
`Publish` is blocked. The user either records one or explicitly attests there
genuinely were none. Attesting is allowed; silently having none is not.

Everything autosaves locally. Closing the app never loses a draft.

**Layout.** Progress bar with completed stages checked, current stage labelled;
the stepper is a progress indicator, not navigation. Sticky footer for
`Back`/`Continue`.

**Microcopy.**
> Stage 3 helper: `Include the parts that did not work. They are the most useful
> thing here.`
> Obstacle gate: `You have not recorded any obstacles. Most routes have at least
> one — and they are what make a pathway useful to someone standing where you
> started.`
> Gate buttons: `Add an obstacle` · `There genuinely were none`
> Field-level: `Compensation is always a band. Pick the range that fits.`

### 6g. `Contact request`

**Purpose.** Route a message through the relay without exposing an address.

**Main content.** Required context field, plus a plain statement of the limits.

**Actions.** `Send` → relay. Disabled until context is written — blank outreach is
rejected server-side, so the UI should not pretend otherwise.

**Microcopy.**
> **Say why you are reaching out.**
> Messages go through Precedent — neither of you sees the other's email address.
> They receive at most 3 messages a week, and can mute this thread or turn contact
> off entirely.

### 6h. `Saved`

**Purpose.** The user's own shelf. Collections, saved searches, and drafts.

**Main content.** Three segments: `Pathways`, `Searches`, `Drafts`.

**Actions.** Row tap → the thing. Swipe → remove. `Alert me` on a saved search →
opt-in, **email-only weekly digest** (`TRUST.md`). There are no push
notifications, and the screen says so rather than leaving it implied.

**Microcopy.**
> `Alerts are a weekly email. Precedent does not send push notifications.`

---

## 7. Profile / settings

| | |
|---|---|
| **Screen name** | `Settings` |
| **Purpose** | Control what is public, what is contactable, and what is deleted. |

**Main content.**
- **Your starting point** — the onboarding answers, editable, used for ranking
- **Your pathways** — each with tier, completeness, and per-field visibility
- **Field-by-field visibility** — per `TRUST.md` §2, visibility is per field, not
  one global toggle
- **Pseudonymity** — display as a pseudonym while staying verified (§3)
- **Contact** — global on/off, per-pathway control, muted threads
- **Consent** (16–17 only) — status, and `Withdraw consent`
- **Account** — email, sign out
- **Delete** — `Delete my data`
- **Appearance** — System / Light / Dark
- **Trust & privacy** — the full `TRUST.md` content in-app

**What happens on tap.**
- Visibility toggle → applies immediately, shows exactly what a stranger now sees
- `Withdraw consent` → confirm → **unpublishes immediately**
- `Delete my data` → typed confirmation → real deletion, propagating to the search
  index, caches, and every similar-pathway list. Irreversible, and the sheet says
  so in those words.

**Layout.** Grouped list. Destructive actions last, in `color.destructive`, behind
a confirmation that names the consequence rather than asking "Are you sure?".

**Microcopy.**
> Pseudonym: `Verification stays attached to your claims, not your name. You can
> be verified and pseudonymous at the same time.`
> Delete: `This deletes your pathways from search, from comparisons, and from
> other people's saved lists. It cannot be undone.`

---

## 8. Empty states

Every empty state names the cause and offers the next action. None is a bare
illustration.

| Screen | Microcopy | Actions |
|---|---|---|
| **No results** | **No one in the index has made this exact move yet.** That is a gap in the data, not a verdict on the transition. Here is what is adjacent to it. | Adjacent routes listed as tappable rows, grouped `Others who started where you are` / `Others who arrived where you want to be`; `Alert me when someone adds this`; `Invite someone who has done it` |
| **Over-filtered** | `No pathways match all of these.` | `Clear all`, `Remove last filter` |
| **No saved pathways** | `Nothing saved yet. Save a pathway to keep it here.` | `Search` |
| **No saved searches** | `Save a search to get a weekly email when someone adds a matching route.` | `Search` |
| **No drafts** | `No drafts. Your progress saves automatically as you write.` | `Add your pathway` |
| **No contact threads** | `No messages. Contact goes through Precedent, so no addresses are shared.` | `Search` |
| **Empty comparison** | `Choose at least two pathways to compare.` | `Browse pathways` |

The no-results state is the highest-value screen in the app: it is where someone
learns that their exact move is unprecedented *and* that near-neighbours exist.
It must never render as a blank screen or a bare `0`.

---

## 9. Error states

Errors state what happened, whether it was the user's fault (usually not), and
what to do next.

| State | Microcopy | Actions |
|---|---|---|
| **Offline** | `You are offline. Saved pathways and drafts still work.` | `Retry`, `Go to Saved` |
| **Request failed** | `That did not load. This is on us, not you.` | `Retry`, `Back` |
| **Pathway not found** | `This pathway is no longer here. The submitter may have deleted it — deletion on Precedent is real deletion.` | `Search`, `Home` |
| **Sign-in link expired** | `That link expired. They are valid for 15 minutes.` | `Send a new link` |
| **Contact rate limit** | `This person has reached their limit of 3 messages this week. You can try again next week.` | `Back`, `Save pathway` |
| **Contact blocked** | `This submitter is not open to contact right now.` | `Back` |
| **Validation** | Field-level, inline, next to the field, on blur. Never a summary alert. | — |
| **Publish blocked (no obstacles)** | `You have not recorded any obstacles.` | `Add an obstacle`, `There genuinely were none` |
| **Consent withdrawn** | `Your guardian withdrew consent, so this pathway is unpublished. It is not deleted — it can be republished if consent is granted again.` | `Settings`, `Contact guardian` |
| **Draft conflict** | `You have a newer draft on another device.` | `Keep this one`, `Use the newer one` |

Rules: never blame the user for a server error; never use a modal for a recoverable
error; never discard typed input on failure.

---

## 10. Success states

Success is confirmed **inline** wherever possible. Only genuinely
consequential events earn a full screen.

| Event | Treatment | Microcopy | Next |
|---|---|---|---|
| **Saved a pathway** | Inline — icon fills, brief toast | `Saved.` | Stay put |
| **Filters applied** | Inline — count updates | `12 pathways` | Stay put |
| **Sign-in complete** | No screen; return to intent | `Signed in.` | The original action, completed |
| **Contact sent** | Full screen | **Message sent.** It goes through Precedent, so your email address stays private. They receive at most 3 messages a week and may not reply. | `Back to pathway` |
| **Pathway published** | Full screen | **Your pathway is live.** It is currently **self-attested**. Verify a step to raise that — verification attaches to individual claims, not to you. | `View it`, `Verify a step`, `Done` |
| **Verification improved** | Full screen | **Now source-linked.** Your enrolment at Regional Public University was confirmed. | `View pathway` |
| **Consent granted** | Full screen | **Consent confirmed. Your pathway is live.** | `View it` |
| **Data deleted** | Full screen | **Deleted.** Your pathways are gone from search, comparisons, and other people's saved lists. | `Done` |

Note the publish screen: it states the tier honestly rather than congratulating.
Tier is derived from evidence, so telling someone they are "verified" when they
are self-attested would be a lie the design system is built to prevent.

**No success state uses confetti, a streak, a score, or a share prompt.** There
are no engagement mechanics in this product, and a celebration animation is an
engagement mechanic.

---

## First-time user test

The flow is correct only if a first-time user can, without instructions:

1. Reach a real pathway within **two taps** of the splash (Skip → index row).
2. Understand that colour on a ribbon means *kind of step*, because the legend is
   adjacent to the first ribbon they see.
3. Discover that setbacks are recorded, because the profile shows them inline
   rather than behind a toggle.
4. Hit an account gate **only** after choosing to save, contact, or submit — and
   land back on the thing they were doing.
5. Read an empty result set as information about the corpus, not as failure.

If any of these breaks, the flow is wrong, not the user.
