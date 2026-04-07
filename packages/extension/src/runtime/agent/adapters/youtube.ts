import type { StructuredContent } from './types';

interface TranscriptSubtitle {
  start: string;
  dur: string;
  text: string;
}

interface YouTubeTranscriptData {
  subtitles: TranscriptSubtitle[];
  videoId: string;
  title: string;
  channelId: string;
}

/**
 * Parse transcript subtitles into time-stamped paragraph segments.
 * Groups subtitles into ~30s chunks for readable paragraphs.
 */
export function parseTranscriptSegments(subtitles: TranscriptSubtitle[]): string[] {
  if (subtitles.length === 0) return [];

  const segments: string[] = [];
  let current: string[] = [];
  let segmentStart = 0;

  for (const sub of subtitles) {
    const startSec = Number.parseFloat(sub.start);

    // Start a new segment every ~30 seconds
    if (current.length > 0 && startSec - segmentStart >= 30) {
      segments.push(current.join(' '));
      current = [];
      segmentStart = startSec;
    }

    if (current.length === 0) {
      segmentStart = startSec;
    }
    current.push(sub.text);
  }

  if (current.length > 0) {
    segments.push(current.join(' '));
  }

  return segments;
}

/**
 * Convert a YouTube transcript fixture/response into StructuredContent.
 * In production, the raw data would come from youtube-caption-extractor.
 */
export async function fetchYouTubeTranscript(
  data: YouTubeTranscriptData,
): Promise<StructuredContent> {
  const segments = parseTranscriptSegments(data.subtitles);

  return {
    title: data.title,
    body: segments.join('\n\n'),
    metadata: {
      videoId: data.videoId,
      channelId: data.channelId,
      segmentCount: segments.length,
    },
    sourceRef: `youtube:${data.videoId}`,
    fetchedAt: new Date().toISOString(),
  };
}
