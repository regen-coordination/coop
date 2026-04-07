import type { StructuredContent } from './types';

interface RSSItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
  content?: string;
}

/**
 * Minimal RSS/Atom XML parser. Extracts items from both RSS 2.0 and Atom feeds.
 * In production, rss-parser would handle this, but we keep it dependency-free for parsing fixtures.
 */
function extractItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Try RSS 2.0 <item> elements
  const rssItemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match = rssItemRegex.exec(xml);

  while (match) {
    const block = match[1];
    items.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      guid: extractTag(block, 'guid') || extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      description: extractTag(block, 'description'),
      content: extractTag(block, 'content'),
    });
    match = rssItemRegex.exec(xml);
  }

  // Try Atom <entry> elements if no RSS items found
  if (items.length === 0) {
    const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let atomMatch = atomEntryRegex.exec(xml);

    while (atomMatch) {
      const block = atomMatch[1];
      const link = extractAtomLink(block) || extractTag(block, 'link');
      items.push({
        title: extractTag(block, 'title'),
        link,
        guid: extractTag(block, 'id') || link,
        pubDate: extractTag(block, 'published') || extractTag(block, 'updated'),
        description: extractTag(block, 'summary'),
        content: extractTagContent(block, 'content'),
      });
      atomMatch = atomEntryRegex.exec(xml);
    }
  }

  return items;
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(block);
  return match ? decodeEntities(match[1].trim()) : '';
}

function extractTagContent(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(block);
  return match ? decodeEntities(match[1].trim()) : '';
}

function extractAtomLink(block: string): string {
  const match = /<link[^>]+href="([^"]*)"/.exec(block);
  return match ? match[1] : '';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Parse an RSS/Atom feed XML string into StructuredContent items.
 * Optionally filters to items published after lastFetchedAt.
 */
export function parseRSSFeed(
  xml: string,
  feedUrl: string,
  lastFetchedAt?: string,
): StructuredContent[] {
  const items = extractItems(xml);
  const seen = new Set<string>();
  const results: StructuredContent[] = [];
  const cutoff = lastFetchedAt ? new Date(lastFetchedAt).getTime() : 0;

  for (const item of items) {
    // Deduplicate by GUID
    if (seen.has(item.guid)) continue;
    seen.add(item.guid);

    // Filter by date if lastFetchedAt provided
    if (cutoff > 0 && item.pubDate) {
      const itemDate = new Date(item.pubDate).getTime();
      if (itemDate <= cutoff) continue;
    }

    const body = item.content || item.description || '';
    // Strip HTML tags for plain text body
    const plainBody = body.replace(/<[^>]+>/g, '').trim();

    results.push({
      title: item.title,
      body: plainBody,
      metadata: {
        guid: item.guid,
        link: item.link,
        pubDate: item.pubDate,
      },
      sourceRef: `rss:${feedUrl}`,
      fetchedAt: new Date().toISOString(),
    });
  }

  return results;
}
