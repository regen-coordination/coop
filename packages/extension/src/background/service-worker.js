import { openDB } from "idb";

const DB_NAME = "coop-extension";
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const feedStore = db.createObjectStore("feed", { keyPath: "id" });
        feedStore.createIndex("by-coop", "coopId");
        feedStore.createIndex("by-date", "createdAt");
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

// Message handlers
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    const db = await getDB();

    if (message?.type === "tab.captured") {
      const item = {
        id: crypto.randomUUID(),
        type: "tab.captured",
        payload: message.payload,
        createdAt: new Date().toISOString(),
        coopId: message.coopId,
      };
      await db.put("feed", item);
      sendResponse({ ok: true, id: item.id });
      return;
    }

    if (message?.type === "voice.transcribed") {
      const item = {
        id: crypto.randomUUID(),
        type: "voice.transcribed",
        payload: message.payload,
        createdAt: new Date().toISOString(),
        coopId: message.coopId,
      };
      await db.put("feed", item);
      sendResponse({ ok: true, id: item.id });
      return;
    }

    if (message?.type === "feed.get") {
      const coopId = message.coopId;
      let items;

      if (coopId) {
        items = await db.getAllFromIndex("feed", "by-coop", coopId);
      } else {
        items = await db.getAll("feed");
      }

      // Sort by date descending, limit to 100
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      sendResponse({ ok: true, items: items.slice(0, 100) });
      return;
    }

    if (message?.type === "feed.clear") {
      await db.clear("feed");
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "settings.get") {
      const value = await db.get("settings", message.key);
      sendResponse({ ok: true, value });
      return;
    }

    if (message?.type === "settings.set") {
      await db.put("settings", message.value, message.key);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unsupported message type" });
  })();

  return true; // Keep channel open for async
});

// Install/update handling
chrome.runtime.onInstalled.addListener(() => {
  console.log("Coop extension installed");
});
