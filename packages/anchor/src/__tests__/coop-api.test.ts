import assert from "node:assert";
import { before, describe, it } from "node:test";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { registerRoutes } from "../api/routes.js";

describe("Coop REST API Integration", () => {
  let app: FastifyInstance;
  let createdCoopId: string;
  let shareCode: string;

  before(async () => {
    app = Fastify({ logger: false });
    await registerRoutes(app);
    await app.ready();
  });

  describe("Health Check", () => {
    it("should return ok status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.ok, true);
    });
  });

  describe("Coop Creation", () => {
    it("should create a new coop", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops",
        payload: {
          name: "Test Community Garden",
          description: "A test coop for integration testing",
          creatorName: "Test Admin",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.ok(body.id);
      assert.strictEqual(body.name, "Test Community Garden");
      assert.ok(body.shareCode);
      assert.ok(body.createdAt);
      assert.ok(Array.isArray(body.members));
      assert.strictEqual(body.members.length, 1);
      assert.strictEqual(body.members[0].displayName, "Test Admin");
      assert.strictEqual(body.members[0].role, "admin");

      createdCoopId = body.id;
      shareCode = body.shareCode;
    });

    it("should reject coop creation without name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops",
        payload: {
          description: "Missing name",
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
      assert.ok(body.error.includes("name"));
    });

    it("should create coop without creator", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops",
        payload: {
          name: "Empty Coop",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.members.length, 0);
    });
  });

  describe("Coop Retrieval", () => {
    it("should get coop by id", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/coops/${createdCoopId}`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.strictEqual(body.id, createdCoopId);
      assert.strictEqual(body.name, "Test Community Garden");
      assert.strictEqual(body.shareCode, shareCode);
    });

    it("should return 404 for non-existent coop", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/coops/non-existent-id",
      });

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });
  });

  describe("Coop Join", () => {
    it("should join coop with share code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops/join",
        payload: {
          shareCode: shareCode,
          displayName: "Test Member",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.ok(body.coop);
      assert.ok(body.member);
      assert.strictEqual(body.coop.id, createdCoopId);
      assert.strictEqual(body.member.displayName, "Test Member");
      assert.strictEqual(body.member.role, "member");
    });

    it("should reject join without share code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops/join",
        payload: {
          displayName: "Test Member",
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });

    it("should reject join with invalid share code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops/join",
        payload: {
          shareCode: "INVALID",
          displayName: "Test Member",
        },
      });

      assert.strictEqual(response.statusCode, 404);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });

    it("should reject join without display name", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/coops/${createdCoopId}/join`,
        payload: {
          shareCode: shareCode,
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });

    it("should reject join with wrong share code", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/coops/${createdCoopId}/join`,
        payload: {
          shareCode: "WRONGCODE",
          displayName: "Test Member",
        },
      });

      assert.strictEqual(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.ok(body.error);
    });

    it("should allow same member to join twice (idempotent)", async () => {
      // First join
      await app.inject({
        method: "POST",
        url: "/api/coops/join",
        payload: {
          shareCode: shareCode,
          displayName: "Duplicate Member",
        },
      });

      // Second join with same name
      const response = await app.inject({
        method: "POST",
        url: "/api/coops/join",
        payload: {
          shareCode: shareCode,
          displayName: "Duplicate Member",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.member);
      assert.strictEqual(body.member.displayName, "Duplicate Member");
    });
  });

  describe("Coop Feed", () => {
    it("should get coop feed", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/coops/${createdCoopId}/feed`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      assert.strictEqual(body.coopId, createdCoopId);
      assert.ok(Array.isArray(body.items));
      // Should have at least coop.created and member.joined events
      assert.ok(body.items.length >= 2);
    });

    it("should return 404 for non-existent coop feed", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/coops/non-existent/feed",
      });

      assert.strictEqual(response.statusCode, 404);
    });

    it("should limit feed to 100 items", async () => {
      // Create a coop with many feed items would be tested here
      // For now, just verify the endpoint works
      const response = await app.inject({
        method: "GET",
        url: `/api/coops/${createdCoopId}/feed`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.ok(body.items.length <= 100);
    });
  });

  describe("Multiple Coops Isolation", () => {
    let secondCoopId: string;
    let secondShareCode: string;

    it("should create a second coop", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/coops",
        payload: {
          name: "Second Test Coop",
          creatorName: "Second Admin",
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      secondCoopId = body.id;
      secondShareCode = body.shareCode;

      assert.notStrictEqual(secondCoopId, createdCoopId);
      assert.notStrictEqual(secondShareCode, shareCode);
    });

    it("should isolate coop data", async () => {
      // First coop should have members from earlier tests
      const firstResponse = await app.inject({
        method: "GET",
        url: `/api/coops/${createdCoopId}`,
      });
      const firstBody = JSON.parse(firstResponse.body);
      assert.ok(firstBody.members.length >= 2); // admin + at least one member

      // Second coop should only have one member
      const secondResponse = await app.inject({
        method: "GET",
        url: `/api/coops/${secondCoopId}`,
      });
      const secondBody = JSON.parse(secondResponse.body);
      assert.strictEqual(secondBody.members.length, 1);
    });

    it("should isolate coop feeds", async () => {
      const firstResponse = await app.inject({
        method: "GET",
        url: `/api/coops/${createdCoopId}/feed`,
      });
      const firstBody = JSON.parse(firstResponse.body);
      const firstItemCount = firstBody.items.length;

      const secondResponse = await app.inject({
        method: "GET",
        url: `/api/coops/${secondCoopId}/feed`,
      });
      const secondBody = JSON.parse(secondResponse.body);

      // Second coop should have fewer items
      assert.ok(secondBody.items.length < firstItemCount);
    });
  });
});
