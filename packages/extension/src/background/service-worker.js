const memoryFeed = [];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'tab.captured') {
    memoryFeed.push({
      id: crypto.randomUUID(),
      type: 'tab.captured',
      payload: message.payload,
      createdAt: new Date().toISOString(),
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'feed.get') {
    sendResponse({ ok: true, items: memoryFeed.slice(-50).reverse() });
    return true;
  }

  if (message?.type === 'voice.transcribed') {
    memoryFeed.push({
      id: crypto.randomUUID(),
      type: 'voice.transcribed',
      payload: message.payload,
      createdAt: new Date().toISOString(),
    });
    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ ok: false, error: 'Unsupported message type' });
  return false;
});
