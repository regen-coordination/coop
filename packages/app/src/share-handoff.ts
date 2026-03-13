export type ReceiverShareHandoff = {
  title?: string;
  note?: string;
  sourceUrl?: string;
};

export function bootstrapReceiverShareHandoff(targetWindow: Window): ReceiverShareHandoff | null {
  if (targetWindow.location.pathname !== '/receiver') {
    return null;
  }

  const params = new URLSearchParams(targetWindow.location.search);
  const title = params.get('title')?.trim() || undefined;
  const note = params.get('text')?.trim() || undefined;
  const sourceUrl = params.get('url')?.trim() || undefined;

  if (!title && !note && !sourceUrl) {
    return null;
  }

  params.delete('title');
  params.delete('text');
  params.delete('url');
  const nextSearch = params.toString();
  targetWindow.history.replaceState({}, '', `/receiver${nextSearch ? `?${nextSearch}` : ''}`);

  return {
    title,
    note,
    sourceUrl,
  };
}
