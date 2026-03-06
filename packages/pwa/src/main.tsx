import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [coopCode, setCoopCode] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
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

  function startVoiceNote() {
    if (!recognition) {
      return;
    }
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setMessages((current) => [transcript, ...current].slice(0, 20));
    };
    recognition.start();
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16, display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>Coop PWA</h1>
      <label>
        Coop share code
        <input
          style={{ display: 'block', width: '100%' }}
          value={coopCode}
          onChange={(e) => setCoopCode(e.target.value)}
          placeholder="COOP-XXXXXX"
        />
      </label>
      <button onClick={startVoiceNote} disabled={!recognition}>
        {recognition ? 'Record voice note' : 'Speech API unavailable'}
      </button>
      <h2 style={{ marginBottom: 0 }}>Recent transcriptions</h2>
      <ul style={{ marginTop: 0 }}>
        {messages.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </main>
  );
}

const root = document.querySelector('#root');
if (root) {
  createRoot(root).render(<App />);
}
