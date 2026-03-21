---
title: Remote Knowledge Skill Re-Enable Checklist
slug: /reference/remote-knowledge-skill-reenable-checklist
---

# Remote Knowledge Skill Re-Enable Checklist

Date: March 20, 2026

The Chrome Web Store compliant build quarantines remote `SKILL.md` import from the shipped
extension. Use this checklist before restoring that feature.

## Codepaths To Revisit

- sidepanel import and refresh UI
- runtime message contracts for remote knowledge-skill actions
- background handlers that fetch, refresh, or persist remote skill content
- prompt assembly paths that inject imported skill text
- polling or freshness logic tied to remote skill content
- storage migrations for imported knowledge-skill records

## Required Questions

1. Does the restored feature change extension behavior based on remote content that reviewers cannot fully inspect at submission time?
2. Can the feature be constrained to repo-owned, packaged, or signed content instead of arbitrary URLs?
3. Does the privacy policy explain what remote content is fetched, when it is fetched, and how it is stored?
4. Can the feature pass Chrome Web Store review without looking like remote hosted code or remote behavior shaping?

## Required Validation

1. Add targeted unit coverage for import, refresh, storage, and prompt assembly.
2. Add a dist audit proving the remote knowledge-skill codepath is either packaged or otherwise compliant.
3. Add explicit reviewer-note language describing the feature and its trust boundaries.
4. Re-run `bun run validate:store-readiness` and `bun run validate:production-readiness`.

## Go / No-Go Rule

Do not re-enable remote knowledge-skill import in the shipped extension until the review, privacy,
and packaging answers are explicit and the release candidate passes the full store-readiness gate.
