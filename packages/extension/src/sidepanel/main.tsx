import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { saveArtifact } from '../lib/indexeddb';
import { MembraneClient } from '../lib/p2p-membrane';

type FeedItem = {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

function App() {
  const [coopName, setCoopName] = useState('My Coop');
  const [shareCode, setShareCode] = useState('COOP-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [joinCode, setJoinCode] = useState('');
  const [dictating, setDictating] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const membrane = useMemo(() => new MembraneClient(), []);
  const recognition = useMemo(() => {
    // @ts-expect-error browser speech API vendor extension
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      return null;
    }
    const r = new Ctor();
    r.continuous = false;
    r.lang = 'en-US';
    return r as SpeechRecognition;
  }, []);

  async function refreshFeed() {
    const response = await chrome.runtime.sendMessage({ type: 'feed.get' });
    if (response?.ok) {
      setFeed(response.items);
    }
  }

  async function addCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }
    const payload = {
      title: tab.title ?? 'Untitled tab',
      url: tab.url ?? '',
    };
    await chrome.runtime.sendMessage({ type: 'tab.captured', payload });
    await saveArtifact({
      id: crypto.randomUUID(),
      type: 'tab.captured',
      payload,
      createdAt: new Date().toISOString(),
    });
    membrane.publish({
      coopId: shareCode,
      type: 'tab.captured',
      payload,
      createdAt: new Date().toISOString(),
    });
    await refreshFeed();
  }

  function startVoice() {
    if (!recognition) {
      return;
    }
    setDictating(true);
    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      await chrome.runtime.sendMessage({
        type: 'voice.transcribed',
        payload: { transcript },
      });
      await saveArtifact({
        id: crypto.randomUUID(),
        type: 'voice.transcribed',
        payload: { transcript },
        createdAt: new Date().toISOString(),
      });
      membrane.publish({
        coopId: shareCode,
        type: 'voice.transcribed',
        payload: { transcript },
        createdAt: new Date().toISOString(),
      });
      setDictating(false);
      await refreshFeed();
    };
    recognition.onerror = () => setDictating(false);
    recognition.onend = () => setDictating(false);
    recognition.start();
  }

  useEffect(() => {
    membrane.connect('ws://localhost:8788');
    const unsubscribe = membrane.subscribe(() => {
      void refreshFeed();
    });
    void refreshFeed();
    return unsubscribe;
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 12, display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0 }}>Coop</h1>
      <section>
        <h2 style={{ marginBottom: 4 }}>Create Coop</h2>
        <input value={coopName} onChange={(e) => setCoopName(e.target.value)} />
        <p style={{ margin: '6px 0' }}>Share code: <strong>{shareCode}</strong></p>
        <button onClick={() => setShareCode('COOP-' + Math.random().toString(36).slice(2, 8).toUpperCase())}>
          Regenerate code
        </button>
      </section>
      <section>
        <h2 style={{ marginBottom: 4 }}>Join Coop</h2>
        <input
          placeholder="Enter sharing code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button disabled={!joinCode.trim()}>Join</button>
      </section>
      <section style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ marginBottom: 4 }}>Capture</h2>
        <button onClick={addCurrentTab}>Add current tab</button>
        <button onClick={startVoice} disabled={dictating || !recognition}>
          {recognition ? (dictating ? 'Listening...' : 'Start voice dictation') : 'Speech API not available'}
        </button>
        <div
          style={{
            border: '1px dashed #666',
            padding: 10,
            borderRadius: 6,
            textAlign: 'center',
            color: '#666',
          }}
        >
          Drag-and-drop canvas area (MVP placeholder)
        </div>
      </section>
      <section>
        <h2 style={{ marginBottom: 4 }}>Activity Feed</h2>
        <ul style={{ paddingInlineStart: 18 }}>
          {feed.map((item) => (
            <li key={item.id}>
              <strong>{item.type}</strong> - {new Date(item.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const root = document.querySelector('#root');
if (root) {
  createRoot(root).render(<App />);
}
