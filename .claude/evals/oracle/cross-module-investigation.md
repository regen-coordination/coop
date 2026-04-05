# Oracle Eval: Cross-Module Investigation

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

> "How does the capture flow work from tab detection to published artifact?"

## Expected Output

Must trace the full path through multiple packages:

1. **Extension (capture)**: Background service worker detects tabs, creates TabCandidate entries in Dexie
2. **Shared/agent (refine)**: Agent pipeline runs 16-skill observation on candidates, produces CoopInterpretation
3. **Extension/Popup + Chickens (review)**: User reviews candidates/drafts, decides what to push
4. **Shared/coop (publish)**: Explicit push creates Artifact in shared Yjs document
5. **Shared/storage + sync (sync)**: Artifact syncs to peers via y-webrtc, persisted to Dexie
6. **Shared/archive (archive)**: Optional archive to Storacha/Filecoin with receipt

Must identify the key boundary: everything before step 4 is local-only, step 4 is the explicit push that makes data shared.

Must cite specific file paths in at least 3 packages.

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Covers 3+ packages | 25% | Traces through extension, shared, and at least one more | Only covers one package |
| Identifies local → shared boundary | 25% | Calls out explicit push as the privacy boundary | Treats everything as shared |
| Specific file paths | 20% | Names actual source files | Only mentions package names |
| Correct data flow order | 20% | Capture → refine → review → publish → sync → archive | Wrong sequence or missing steps |
| Synthesis/summary | 10% | Ends with a clear mental model | Dumps findings without conclusion |
