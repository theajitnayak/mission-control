# Mission Control

One page showing every project I am running: what stage it is at, how far it has
got, what is next, and what it is stuck on.

**Live:** https://theajitnayak.github.io/mission-control/

## How it stays current

- `data/projects.json` holds the words. This is the only file written by hand.
- `scripts/build.mjs` adds the facts: commit counts, when each repo was last
  pushed, and whether each site is answering. It writes `data/state.json`.
- The page reads `state.json`. It is a static page, so GitHub Pages serves it.
- A GitHub Action reruns the build every morning at 08:30 IST and redeploys.

Never edit `data/state.json`. It is overwritten on every build.

## Adding a project

Add one object to the `projects` array in `data/projects.json`:

```json
{
  "id": "short-slug",
  "name": "Display Name",
  "oneLiner": "What it is, in one sentence.",
  "stage": "idea | building | built | live | earning",
  "repo": "theajitnayak/repo-name",
  "url": "https://example.com",
  "started": "2026-09-21",
  "done":  ["things already finished"],
  "next":  ["things still to do"],
  "blocker":   "What is holding it up, or null.",
  "needsAjit": "What only I can do, or null.",
  "moneyPath": "How this makes money."
}
```

`repo` and `url` can be `null` if there is no repo or nothing public yet.
The progress bar is `done / (done + next)`, so it moves as items shift.

## Running it locally

```
npm run build     # refresh state.json
npm run serve     # build, then serve on http://localhost:4321
```

Node 20 or newer.
