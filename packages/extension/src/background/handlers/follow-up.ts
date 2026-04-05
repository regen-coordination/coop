/** Fire-and-forget follow-up: swallows rejections and logs a warning. */
export function queueFollowUp(domain: string, label: string, operation: Promise<unknown>) {
  void Promise.resolve(operation).catch((error) => {
    console.warn(`[${domain}] ${label} failed:`, error);
  });
}
