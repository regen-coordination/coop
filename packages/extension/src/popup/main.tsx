import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
  const [activeCoop, setActiveCoop] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an active coop
    const saved = localStorage.getItem("coop.active");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveCoop(parsed.name);
      } catch {
        // ignore
      }
    }
  }, []);

  function openSidePanel() {
    // Open the side panel
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    // Close the popup
    window.close();
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", minWidth: 280, padding: 16 }}>
      <h1 style={{ fontSize: 20, marginTop: 0, marginBottom: 12 }}>Coop</h1>

      <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#666" }}>
        Browser-based knowledge commons for community coordination
      </p>

      {activeCoop && (
        <div
          style={{
            padding: "12px",
            background: "#e8f5e9",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          <strong>Active:</strong> {activeCoop}
        </div>
      )}

      <button
        type="button"
        onClick={openSidePanel}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: "16px",
          fontWeight: 600,
          background: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "20px" }}>→</span>
        Open Side Panel
      </button>

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#f5f5f5",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <strong>What you can do:</strong>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
          <li>Capture web pages with AI extraction</li>
          <li>Record voice notes continuously</li>
          <li>Collaborate in real-time</li>
          <li>Process with AI (4 pillars)</li>
        </ul>
      </div>

      <div
        style={{
          marginTop: "12px",
          fontSize: "11px",
          color: "#999",
          textAlign: "center",
        }}
      >
        Tip: You can also right-click the Coop icon → "Open side panel"
      </div>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<Popup />);
}
