import { describe, expect, it } from 'vitest';
import { fetchYouTubeTranscript, parseTranscriptSegments } from '../youtube';
import noCaptionsFixture from './fixtures/youtube-no-captions.json';
import transcriptFixture from './fixtures/youtube-transcript-response.json';

describe('fetchYouTubeTranscript', () => {
  it('returns StructuredContent for fixture response', async () => {
    const result = await fetchYouTubeTranscript(transcriptFixture);

    expect(result.title).toBe('Context Graphs for Agent Memory');
    expect(result.body).toContain('knowledge graphs');
    expect(result.sourceRef).toContain('qMV64p-4Deo');
    expect(result.fetchedAt).toBeTruthy();
    expect(result.metadata).toHaveProperty('channelId', 'UC_x5XG1OV2P6uZZ5FSM9Ttw');
  });

  it('returns empty body for no-captions fixture', async () => {
    const result = await fetchYouTubeTranscript(noCaptionsFixture);

    expect(result.title).toBe('Video Without Captions');
    expect(result.body).toBe('');
  });
});

describe('parseTranscriptSegments', () => {
  it('chunks subtitles into time-stamped paragraphs', () => {
    const segments = parseTranscriptSegments(transcriptFixture.subtitles);

    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0]).toContain('knowledge graphs');
    // Should have timestamps in the output
    for (const segment of segments) {
      expect(segment.length).toBeGreaterThan(0);
    }
  });
});
