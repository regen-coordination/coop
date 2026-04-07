import type { StructuredContent } from './types';

interface RedditPostData {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
}

interface RedditListingResponse {
  data: {
    children: Array<{ data: RedditPostData }>;
  };
}

/**
 * Parse a Reddit JSON listing response into StructuredContent items.
 */
export function parseRedditPosts(
  data: RedditListingResponse,
  subreddit: string,
): StructuredContent[] {
  const posts = data.data?.children ?? [];

  return posts.map((child) => {
    const post = child.data;
    return {
      title: post.title,
      body: post.selftext,
      metadata: {
        author: post.author,
        score: post.score,
        numComments: post.num_comments,
        permalink: post.permalink,
        createdUtc: post.created_utc,
      },
      sourceRef: `reddit:${subreddit}:${post.id}`,
      fetchedAt: new Date().toISOString(),
    };
  });
}
