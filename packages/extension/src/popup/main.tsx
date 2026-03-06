import { createRoot } from 'react-dom/client';

function Popup() {
  return (
    <main style={{ fontFamily: 'sans-serif', minWidth: 260, padding: 12 }}>
      <h1 style={{ fontSize: 18, marginTop: 0 }}>Coop</h1>
      <p style={{ margin: 0 }}>Open the side panel to capture tabs and voice notes.</p>
    </main>
  );
}

const root = document.querySelector('#root');
if (root) {
  createRoot(root).render(<Popup />);
}
