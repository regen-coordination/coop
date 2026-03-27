# Filecoin Cold Storage

**Feature**: `filecoin-cold-storage`
**Status**: Backlog
**Source Branch**: `feature/filecoin-cold-storage`
**Created**: `2026-03-26`
**Last Updated**: `2026-03-26`

## Summary

Close the remaining verification and retrieval gaps around the already-working archive pipeline so archived data is easier to trust, inspect, and share.

## In Scope

- verified retrieval of archived bundles
- tighter receipt-to-proof visibility in the existing archive UI
- shareable verification entry points when backed by real code paths
- small follow-up improvements to receipt freshness or error visibility

## Out Of Scope

- rebuilding the Storacha setup flow that already exists
- redoing archive receipt lifecycle UI that is already shipped
- speculative protocol work or new registry scope without a near-term product need
