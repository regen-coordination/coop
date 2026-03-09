import assert from "node:assert";
import { describe, it } from "node:test";
import { MEMBRANE_EVENT_TYPE, createMembraneEvent } from "../protocols/membrane-client.js";
import { COOP_MESSAGE_TYPE, createCoopMessage } from "../protocols/messages.js";

describe("Message Types", () => {
  it("should have all required message types", () => {
    assert.strictEqual(COOP_MESSAGE_TYPE.TAB_CAPTURED, "tab.captured");
    assert.strictEqual(COOP_MESSAGE_TYPE.VOICE_TRANSCRIBED, "voice.transcribed");
    assert.strictEqual(COOP_MESSAGE_TYPE.CONTENT_PROPOSED, "content.proposed");
    assert.strictEqual(COOP_MESSAGE_TYPE.CONTENT_APPROVED, "content.approved");
    assert.strictEqual(COOP_MESSAGE_TYPE.SYNC_REQUEST, "sync.request");
    assert.strictEqual(COOP_MESSAGE_TYPE.SYNC_RESPONSE, "sync.response");
    assert.strictEqual(COOP_MESSAGE_TYPE.STORAGE_PUT, "storage.put");
  });

  it("should create coop messages with defaults", () => {
    const message = createCoopMessage({
      coopId: "coop-123",
      fromNodeId: "node-456",
      type: COOP_MESSAGE_TYPE.TAB_CAPTURED,
      payload: { url: "https://example.com" },
    });

    assert.ok(message.id);
    assert.strictEqual(message.coopId, "coop-123");
    assert.strictEqual(message.fromNodeId, "node-456");
    assert.strictEqual(message.type, COOP_MESSAGE_TYPE.TAB_CAPTURED);
    assert.deepStrictEqual(message.payload, { url: "https://example.com" });
    assert.ok(message.createdAt);
  });

  it("should use provided id and createdAt if given", () => {
    const customId = "custom-id-123";
    const customDate = "2024-01-01T00:00:00Z";

    const message = createCoopMessage({
      coopId: "coop-123",
      fromNodeId: "node-456",
      type: COOP_MESSAGE_TYPE.TAB_CAPTURED,
      payload: {},
      id: customId,
      createdAt: customDate,
    });

    assert.strictEqual(message.id, customId);
    assert.strictEqual(message.createdAt, customDate);
  });
});

describe("Membrane Events", () => {
  it("should have all required event types", () => {
    assert.strictEqual(MEMBRANE_EVENT_TYPE.JOIN, "join");
    assert.strictEqual(MEMBRANE_EVENT_TYPE.JOINED, "joined");
    assert.strictEqual(MEMBRANE_EVENT_TYPE.ERROR, "error");
    assert.strictEqual(MEMBRANE_EVENT_TYPE.TAB_CAPTURED, "tab.captured");
    assert.strictEqual(MEMBRANE_EVENT_TYPE.STORAGE_PUT, "storage.put");
  });

  it("should create membrane events with defaults", () => {
    const event = createMembraneEvent({
      coopId: "coop-123",
      type: MEMBRANE_EVENT_TYPE.JOIN,
      payload: { displayName: "Alice" },
    });

    assert.strictEqual(event.coopId, "coop-123");
    assert.strictEqual(event.type, MEMBRANE_EVENT_TYPE.JOIN);
    assert.deepStrictEqual(event.payload, { displayName: "Alice" });
    assert.ok(event.createdAt);
  });
});
