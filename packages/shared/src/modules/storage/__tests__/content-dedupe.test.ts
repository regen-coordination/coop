import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import type { TabCandidate } from '../../../contracts/schema';
import { canonicalizeUrl, hashText } from '../../../utils';
import { buildReadablePageExtract } from '../../coop/pipeline';
import { findDuplicatePageExtract, savePageExtract } from '../db-crud-content';
import { type CoopDexie, createCoopDb } from '../db-schema';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const databases: CoopDexie[] = [];

function freshDb() {
  const db = createCoopDb(`coop-content-dedupe-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases) {
    try {
      db.close();
      await Dexie.delete(db.name);
    } catch {
      // ignore cleanup errors
    }
  }
  databases.length = 0;
});

function buildCandidate(input: {
  id: string;
  url: string;
  title: string;
  capturedAt?: string;
}): TabCandidate {
  const canonicalUrl = canonicalizeUrl(input.url);
  return {
    id: input.id,
    tabId: Number.parseInt(input.id.replace(/\D+/g, ''), 10) || 1,
    windowId: 1,
    url: input.url,
    canonicalUrl,
    canonicalUrlHash: hashText(canonicalUrl),
    title: input.title,
    domain: new URL(input.url).hostname.replace(/^www\./, ''),
    capturedAt: input.capturedAt ?? '2026-03-27T12:00:00.000Z',
  };
}

describe('findDuplicatePageExtract', () => {
  it('reuses a recent same-domain extract for near-duplicate content', async () => {
    const db = freshDb();
    const existing = buildReadablePageExtract({
      candidate: buildCandidate({
        id: 'candidate-1',
        url: 'https://funding.example.org/grants/watershed-roundup',
        title: 'Watershed restoration grant roundup for 2026',
        capturedAt: '2026-03-27T12:00:00.000Z',
      }),
      metaDescription:
        'A funding brief covering watershed restoration grants, local match requirements, and proposal timing.',
      headings: ['Funding brief', 'Application timeline'],
      paragraphs: [
        'This grant roundup tracks watershed restoration funding deadlines, local match requirements, and proposal milestones for river alliances.',
        'Teams can use the brief to gather eligibility evidence, confirm deadlines, and coordinate the proposal packet before submission.',
        'Subscribe for updates and share this article with your network.',
      ],
    });

    await savePageExtract(db, existing);

    const printView = buildReadablePageExtract({
      candidate: buildCandidate({
        id: 'candidate-2',
        url: 'https://funding.example.org/news/watershed-roundup-print',
        title: '2026 watershed restoration grant round-up',
        capturedAt: '2026-03-27T12:05:00.000Z',
      }),
      metaDescription:
        'Funding brief for watershed restoration collaboratives with local match guidance and submission timing.',
      headings: ['Application timeline', 'Funding brief'],
      paragraphs: [
        'River alliances can use this funding brief to gather eligibility evidence, confirm proposal timing, and prepare the submission packet.',
        'This watershed restoration grant roundup tracks funding deadlines and local match requirements for collaborative projects.',
        'Print this page or share it with a colleague.',
      ],
    });

    await expect(findDuplicatePageExtract(db, printView)).resolves.toBe(existing.id);
  });

  it('does not reuse a stale near-duplicate outside the lookback window', async () => {
    const db = freshDb();
    const stale = buildReadablePageExtract({
      candidate: buildCandidate({
        id: 'candidate-3',
        url: 'https://funding.example.org/grants/watershed-roundup',
        title: 'Watershed restoration grant roundup for 2026',
        capturedAt: '2026-02-01T12:00:00.000Z',
      }),
      metaDescription:
        'A funding brief covering watershed restoration grants, local match requirements, and proposal timing.',
      headings: ['Funding brief', 'Application timeline'],
      paragraphs: [
        'This grant roundup tracks watershed restoration funding deadlines, local match requirements, and proposal milestones for river alliances.',
        'Teams can use the brief to gather eligibility evidence, confirm deadlines, and coordinate the proposal packet before submission.',
      ],
    });

    await savePageExtract(db, {
      ...stale,
      createdAt: '2026-02-01T12:00:00.000Z',
    });

    const current = buildReadablePageExtract({
      candidate: buildCandidate({
        id: 'candidate-4',
        url: 'https://funding.example.org/news/watershed-roundup-print',
        title: '2026 watershed restoration grant round-up',
        capturedAt: '2026-03-27T12:05:00.000Z',
      }),
      metaDescription:
        'Funding brief for watershed restoration collaboratives with local match guidance and submission timing.',
      headings: ['Application timeline', 'Funding brief'],
      paragraphs: [
        'River alliances can use this funding brief to gather eligibility evidence, confirm proposal timing, and prepare the submission packet.',
        'This watershed restoration grant roundup tracks funding deadlines and local match requirements for collaborative projects.',
      ],
    });

    await expect(findDuplicatePageExtract(db, current)).resolves.toBeUndefined();
  });
});
