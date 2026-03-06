window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }
  if (event.data?.type !== 'coop.capture-page') {
    return;
  }

  const payload = {
    title: document.title,
    url: window.location.href,
    textSnippet: document.body?.innerText?.slice(0, 1000) ?? '',
  };

  chrome.runtime.sendMessage({ type: 'tab.captured', payload });
});
