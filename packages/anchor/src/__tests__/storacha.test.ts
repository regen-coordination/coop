import assert from "node:assert";
import { describe, it } from "node:test";
import { uploadDirectory, uploadToStoracha } from "../storage/storacha.js";

describe("Storacha Storage", () => {
  describe("uploadToStoracha", () => {
    it("should fallback when STORACHA_KEY not configured", async () => {
      // Ensure no Storacha config in test environment
      const originalKey = process.env.STORACHA_KEY;
      const originalProof = process.env.STORACHA_PROOF;
      process.env.STORACHA_KEY = undefined;
      process.env.STORACHA_PROOF = undefined;

      try {
        const result = await uploadToStoracha({
          coopId: "test-coop",
          id: "test-artifact-123",
          content: JSON.stringify({ test: "data" }),
          filename: "test.json",
          contentType: "application/json",
        });

        assert.strictEqual(result.status, "fallback");
        assert.ok(result.cid);
        assert.ok(result.cid.startsWith("bafy-"));
        assert.ok(result.uri);
        assert.ok(result.uri.startsWith("ipfs://"));
      } finally {
        // Restore env vars
        if (originalKey) process.env.STORACHA_KEY = originalKey;
        if (originalProof) process.env.STORACHA_PROOF = originalProof;
      }
    });

    it("should generate unique CIDs for different artifacts", async () => {
      process.env.STORACHA_KEY = undefined;

      const result1 = await uploadToStoracha({
        coopId: "test-coop",
        id: "artifact-1",
        content: "Content A",
      });

      const result2 = await uploadToStoracha({
        coopId: "test-coop",
        id: "artifact-2",
        content: "Content B",
      });

      assert.notStrictEqual(result1.cid, result2.cid);
    });

    it("should handle text content", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "text-artifact",
        content: "Plain text content",
        contentType: "text/plain",
        filename: "notes.txt",
      });

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
    });

    it("should handle JSON content", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "json-artifact",
        content: JSON.stringify({ key: "value", nested: { data: true } }),
        contentType: "application/json",
        filename: "data.json",
      });

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
    });

    it("should handle missing optional fields", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "minimal-artifact",
        content: "Minimal content",
        // No filename, no contentType
      });

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
      assert.ok(result.uri);
    });
  });

  describe("uploadDirectory", () => {
    it("should fallback when STORACHA_KEY not configured", async () => {
      process.env.STORACHA_KEY = undefined;

      const artifacts = [
        { id: "file1", content: "Content 1", filename: "file1.txt" },
        { id: "file2", content: "Content 2", filename: "file2.txt" },
      ];

      const result = await uploadDirectory("test-coop", artifacts);

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
      assert.ok(result.uri);
    });

    it("should handle empty artifacts array", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadDirectory("test-coop", []);

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
    });

    it("should generate unique CIDs for different directory uploads", async () => {
      process.env.STORACHA_KEY = undefined;

      const artifacts1 = [{ id: "a", content: "A", filename: "a.txt" }];
      const artifacts2 = [{ id: "b", content: "B", filename: "b.txt" }];

      const result1 = await uploadDirectory("coop-1", artifacts1);
      const result2 = await uploadDirectory("coop-2", artifacts2);

      assert.notStrictEqual(result1.cid, result2.cid);
    });
  });

  describe("CID Format", () => {
    it("should generate valid fallback CID format", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "cid-test",
        content: "test",
      });

      // CID should start with bafy- (IPFS v1 CID prefix)
      assert.ok(result.cid.startsWith("bafy-"));
      // CID should be reasonable length (base64-ish)
      assert.ok(result.cid.length > 10);
      assert.ok(result.cid.length < 60);
    });

    it("should create valid IPFS URIs", async () => {
      process.env.STORACHA_KEY = undefined;

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "uri-test",
        content: "test",
      });

      assert.ok(result.uri.startsWith("ipfs://"));
      assert.ok(result.uri.includes(result.cid));
    });
  });

  describe("Error Handling", () => {
    it("should handle very long content", async () => {
      process.env.STORACHA_KEY = undefined;

      const longContent = "x".repeat(100000); // 100KB of data

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "long-content",
        content: longContent,
      });

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
    });

    it("should handle special characters in content", async () => {
      process.env.STORACHA_KEY = undefined;

      const specialContent = 'Special chars: ñ 中文 🎉 <script> & "quotes" \n\t';

      const result = await uploadToStoracha({
        coopId: "test-coop",
        id: "special-chars",
        content: specialContent,
      });

      assert.strictEqual(result.status, "fallback");
      assert.ok(result.cid);
    });
  });
});
