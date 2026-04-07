export interface StructuredContent {
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  sourceRef: string;
  fetchedAt: string;
}
