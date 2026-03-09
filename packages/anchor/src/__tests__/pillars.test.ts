import assert from "node:assert";
import { describe, it } from "node:test";
import {
  runCapitalFormation,
  runCoordination,
  runGovernance,
  runImpactReporting,
} from "../agent/pillars.js";

describe("Pillar Handlers", () => {
  describe("runImpactReporting", () => {
    it("should extract evidence links from text", () => {
      const input = {
        text: "Check out https://example.com/report and also [link](https://test.org/doc)",
        sourceType: "tab" as const,
      };

      const result = runImpactReporting(input);

      assert.ok(result.evidence);
      assert.ok(result.evidence.length >= 1);
      assert.ok(result.evidence.some((e) => e.includes("example.com")));
    });

    it("should extract metrics with numbers", () => {
      const input = {
        text: "We helped 50 people and planted 100 trees over 5 acres",
        sourceType: "voice" as const,
      };

      const result = runImpactReporting(input);

      assert.ok(result.metrics);
      assert.ok(result.metrics.length > 0);
    });

    it("should return structured output", () => {
      const input = {
        text: "Community garden project with 20 volunteers",
        sourceType: "note" as const,
      };

      const result = runImpactReporting(input);

      assert.ok(result.title);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.actions));
      assert.ok(Array.isArray(result.stakeholders));
    });
  });

  describe("runCoordination", () => {
    it("should return coordination actions", () => {
      const input = {
        text: "Need to schedule the weekly sync",
        sourceType: "tab" as const,
      };

      const result = runCoordination(input);

      assert.ok(result.title);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.actions));
      assert.ok(result.actions.length > 0);
    });
  });

  describe("runGovernance", () => {
    it("should return governance actions", () => {
      const input = {
        text: "Proposal to change the meeting time",
        sourceType: "voice" as const,
      };

      const result = runGovernance(input);

      assert.ok(result.title);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.actions));
    });
  });

  describe("runCapitalFormation", () => {
    it("should return capital formation actions", () => {
      const input = {
        text: "Apply for the community grant by next week",
        sourceType: "note" as const,
      };

      const result = runCapitalFormation(input);

      assert.ok(result.title);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.actions));
    });
  });
});
