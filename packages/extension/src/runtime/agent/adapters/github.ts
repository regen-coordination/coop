import type { StructuredContent } from './types';

interface GitHubRepoData {
  name?: string;
  full_name?: string;
  description?: string;
  default_branch?: string;
  stargazers_count?: number;
  language?: string;
  topics?: string[];
  readme_content?: string;
  tree?: Array<{ path: string; type: string }>;
  message?: string;
}

/**
 * Parse a GitHub repo API response into StructuredContent.
 * Handles both successful responses and 404s.
 */
export function parseGitHubRepoContext(
  data: GitHubRepoData,
  identifier: string,
): StructuredContent {
  // Handle 404 or error responses
  if (data.message === 'Not Found' || !data.full_name) {
    return {
      title: identifier,
      body: '',
      metadata: { error: true, message: data.message ?? 'Not found' },
      sourceRef: `github:${identifier}`,
      fetchedAt: new Date().toISOString(),
    };
  }

  const bodyParts: string[] = [];

  if (data.description) {
    bodyParts.push(data.description);
  }

  if (data.readme_content) {
    bodyParts.push(data.readme_content);
  }

  if (data.tree && data.tree.length > 0) {
    const treeStr = data.tree.map((t) => `${t.type === 'tree' ? '📁' : '📄'} ${t.path}`).join('\n');
    bodyParts.push(`\nFile tree:\n${treeStr}`);
  }

  return {
    title: identifier,
    body: bodyParts.join('\n\n'),
    metadata: {
      language: data.language ?? null,
      stars: data.stargazers_count ?? 0,
      topics: data.topics ?? [],
      defaultBranch: data.default_branch ?? 'main',
    },
    sourceRef: `github:${identifier}`,
    fetchedAt: new Date().toISOString(),
  };
}
