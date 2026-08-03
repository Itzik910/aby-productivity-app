# Verification rule

Before considering any change to this repo done, actually verify it — don't
stop at "the code looks right."

- **Server changes** (`server/`): run `npm test` from `server/`. The suite
  mocks Mongoose models, so it runs without a real database and gives real
  pass/fail signal, not just a syntax check.
- **Client changes** (`client/`): run `npx tsc --noEmit -p tsconfig.json`
  and a full production build (`CI=true npx react-scripts build`) from
  `client/`. Treat new ESLint warnings/errors introduced by the change as
  failures; pre-existing warnings in untouched files are not your problem to
  fix incidentally.
- **New, isolated logic** (an AI service method, a utility function, a regex,
  a fallback path): exercise it directly with a small Node script hitting
  the real function, the way you'd sanity-check any pure function — this
  catches real bugs that type-checking can't (see: the `_streamParseFallback`
  Hebrew-splitting bug, only found by actually running it against the exact
  input in question).

## What "run it live" does NOT mean here

Do not attempt to boot a full local server against a real database, and do
not point a local client at the deployed production backend
(`onrender.com`) — the user has explicitly opted out of the latter to avoid
touching real production data.

A full local live server was investigated once and is **not currently
possible** in a sandboxed session: this environment's outbound network is
allowlisted, `fastdl.mongodb.org` is not on it, and `server/scripts/
dev-with-memory-db.js` (an in-memory-Mongo dev bootstrap already in this
repo, no local `mongod` required) fails to download the MongoDB binary as a
result — confirmed via the agent-proxy's own diagnostics as a policy block
(403), not a fixable bug, across multiple MongoDB versions. There is also no
local `mongod`, and no Docker daemon available. Do not re-attempt this path
per session; if the sandbox's network policy changes, this note can be
revisited.

If a task genuinely can't be verified any of the above ways (e.g. a visual
layout change that needs a real screen), say so explicitly rather than
claiming it was tested.
