# UI Action Coverage Hardening

**Feature**: `ui-action-coverage-hardening`
**Status**: Active
**Source Branch**: `refactor/ui-action-coverage-hardening`
**Created**: `2026-03-26`
**Last Updated**: `2026-03-26`

## Summary

Close the remaining confidence gaps between mocked UI tests and real extension behavior, especially around popup actions, sync resilience, and state persistence.

## In Scope

- popup action browser coverage
- stateful sidepanel persistence tests
- sync resilience and degraded-state coverage
- validation-suite wiring for these slices

## Out Of Scope

- generic snapshot growth with no confidence gain
