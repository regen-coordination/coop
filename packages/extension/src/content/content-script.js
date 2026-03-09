import { Readability } from "@mozilla/readability";

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  if (event.data?.type !== "coop.capture-page") {
    return;
  }

  // Use Readability for rich article extraction
  const documentClone = document.cloneNode(true);
  const reader = new Readability(documentClone);
  const article = reader.parse();

  const payload = {
    title: document.title,
    url: window.location.href,
    textSnippet: document.body?.innerText?.slice(0, 2000) ?? "",
    article: article
      ? {
          title: article.title,
          excerpt: article.excerpt,
          byline: article.byline,
          content: article.content?.slice(0, 5000),
          textContent: article.textContent?.slice(0, 3000),
          length: article.length,
          siteName: article.siteName,
        }
      : null,
  };

  chrome.runtime.sendMessage({ type: "tab.captured", payload });
});

// Listen for capture requests from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "capture.active.tab") {
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    sendResponse({
      ok: true,
      payload: {
        title: document.title,
        url: window.location.href,
        textSnippet: document.body?.innerText?.slice(0, 2000) ?? "",
        article: article
          ? {
              title: article.title,
              excerpt: article.excerpt,
              byline: article.byline,
              content: article.content?.slice(0, 5000),
              textContent: article.textContent?.slice(0, 3000),
              length: article.length,
              siteName: article.siteName,
            }
          : null,
      },
    });
    return true;
  }
  return false;
});
