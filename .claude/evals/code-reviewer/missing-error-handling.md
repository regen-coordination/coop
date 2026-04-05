# Code Reviewer Eval: Missing Error Handling

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

Review a PR that adds a new async function fetching coop data without try/catch, no error boundary wrapping the consuming component, and raw error objects shown to the user via `toast.error(error.message)`.

```typescript
// New function in shared/src/modules/coop/index.ts
export async function fetchCoopMembers(coopId: string) {
  const response = await fetch(`/api/coops/${coopId}/members`);
  const data = await response.json();
  return data.members;
}

// Usage in extension popup
function MemberList({ coopId }: { coopId: string }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    fetchCoopMembers(coopId).then(setMembers);
  }, [coopId]);
  return members.map(m => <MemberCard key={m.id} member={m} />);
}
```

## Expected Output

- **must_fix**: 1 — Unhandled promise rejection (no .catch() or try/catch on the fetch call)
- **should_fix**: 1 — No user-friendly error message (should use categorizeError + toast)
- **recommendation**: REQUEST_CHANGES

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Catches unhandled promise | 30% | Flags the missing .catch() as must_fix | Misses it or downgrades to should_fix |
| Flags raw error exposure | 25% | Notes missing categorizeError/user-friendly message | Ignores error UX |
| Correct severity levels | 20% | must_fix for crash, should_fix for UX | Wrong severity assignments |
| No false positives | 15% | Doesn't flag correct patterns as issues | Flags style/naming as must_fix |
| Recommendation = REQUEST_CHANGES | 10% | Correctly recommends changes | Approves despite must_fix |
