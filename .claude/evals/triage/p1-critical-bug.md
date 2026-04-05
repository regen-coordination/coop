# Triage Eval: P1 Critical Bug

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

> User reports: "Extension popup is blank white screen after update, console shows TypeError: Cannot read properties of undefined (reading 'map')"

## Expected Output

- **Severity**: P1 (service down for users)
- **Type**: bug
- **Affected package**: extension
- **Root cause hint**: Likely a data shape change in shared breaking a .map() call in popup
- **Route to**: cracked-coder with `--mode tdd_bugfix`
- **Not**: oracle (no investigation needed — clear stack trace), not P2 (popup is primary surface)

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Severity = P1 | 30% | Correctly identifies as P1 | Classifies as P2 or lower |
| Package = extension | 20% | Identifies extension as affected | Points to shared or app |
| Routes to cracked-coder | 25% | Routes to cracked-coder with TDD | Routes to oracle or /debug |
| Concise brief | 15% | Brief is < 5 lines | Over-explains or speculates |
| Correct type = bug | 10% | Identifies as bug | Classifies as enhancement |
