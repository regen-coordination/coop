# Code Reviewer Eval: Clean Refactor

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

Review a PR that extracts a utility function from a component into shared/src/utils/. No behavior change. Tests pass. The extraction follows barrel import conventions.

```typescript
// Before: inline in extension/src/views/Popup/TabList.tsx
function formatTabAge(createdAt: number): string {
  const diff = Date.now() - createdAt;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

// After: extracted to shared/src/utils/format-time.ts
export function formatTabAge(createdAt: number): string { /* same logic */ }

// shared/src/index.ts updated with re-export
export { formatTabAge } from './utils/format-time';

// TabList.tsx now imports from @coop/shared
import { formatTabAge } from '@coop/shared';
```

## Expected Output

- **must_fix**: 0
- **should_fix**: 0-1 (optional: could suggest `formatRelativeTime` as a more general name)
- **recommendation**: APPROVE

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Approves clean refactor | 35% | APPROVE recommendation | REQUEST_CHANGES on a clean PR |
| No false must_fix | 30% | Zero must_fix findings | Invents issues that don't exist |
| Recognizes barrel import correctness | 20% | Notes the import follows conventions | Flags import pattern as issue |
| Optional naming suggestion only | 15% | At most a should_fix naming suggestion | Demands changes for style |
