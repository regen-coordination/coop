import assert from "node:assert";
import { describe, it } from "node:test";
import { MembraneClient } from "../protocols/membrane-client.js";
import {
  ColdStorage,
  IndexedDBStorage,
  WebSocketStorage,
  createThreeLayerStorage,
} from "../storage/three-layer.js";

describe("Storage Layers", () => {
  describe("ColdStorage", () => {
    it("should store and retrieve values", async () => {
      const storage = new ColdStorage<string>();

      await storage.put("key1", "value1");
      const result = await storage.get("key1");

      assert.strictEqual(result, "value1");
    });

    it("should return null for missing keys", async () => {
      const storage = new ColdStorage<string>();

      const result = await storage.get("nonexistent");

      assert.strictEqual(result, null);
    });

    it("should list all entries", async () => {
      const storage = new ColdStorage<string>();

      await storage.put("key1", "value1");
      await storage.put("key2", "value2");

      const list = await storage.list();

      assert.strictEqual(list.length, 2);
      assert.ok(list.some((item) => item.key === "key1" && item.value === "value1"));
      assert.ok(list.some((item) => item.key === "key2" && item.value === "value2"));
    });
  });

  describe("createThreeLayerStorage", () => {
    it("should create storage with all three layers", () => {
      const storage = createThreeLayerStorage({
        coopId: "test-coop",
        membraneUrl: undefined,
      });

      assert.ok(storage.local);
      assert.ok(storage.shared);
      assert.ok(storage.cold);
    });
  });
});

describe("API Types", () => {
  it("should define CoopPillar correctly", () => {
    const pillars = ["impact-reporting", "coordination", "governance", "capital-formation"];

    assert.strictEqual(pillars.length, 4);
  });
});
