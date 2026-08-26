import { describe, expect, it } from "vitest";
import { spatialInfluenceQuestion } from "@/features/questions/example-question";
import { canSubmitAnswer, evaluateAnswer } from "@/features/questions/session";
import { createGisEngine } from "./engine";
import { gisToolRegistry } from "./tool-registry";

describe("Spatial Influence GIS engine", () => {
  const clock = () => new Date("2026-08-26T10:00:00.000Z");

  it("requires a buffer before overlay", () => {
    const engine = createGisEngine(spatialInfluenceQuestion, clock);

    expect(() => engine.runOverlay()).toThrow("Jalankan Buffer 500 m sebelum Overlay.");
    expect(engine.getSnapshot().activities).toHaveLength(0);
  });

  it("builds the configured 500 m buffer and records the activity", () => {
    const engine = createGisEngine(spatialInfluenceQuestion, clock);
    const result = engine.runBuffer();

    expect(result.snapshot.bufferFeature).not.toBeNull();
    expect(result.snapshot.completedTools).toContain("buffer");
    expect(result.activity).toMatchObject({
      id: 1,
      toolId: "buffer",
      label: "Buffer 500 m",
      completedAt: "2026-08-26T10:00:00.000Z",
    });
  });

  it("overlays configured villages and identifies only Desa A", () => {
    const engine = createGisEngine(spatialInfluenceQuestion, clock);

    engine.runBuffer();
    const result = engine.runOverlay();

    expect(result.snapshot.affectedVillageIds).toEqual(["village-a"]);
    expect(result.snapshot.completedTools).toEqual(["buffer", "overlay"]);
    expect(result.snapshot.activities.map((activity) => activity.toolId)).toEqual(["buffer", "overlay"]);
  });

  it("gates submission on the required activity and evaluates A/B/C/D answers", () => {
    const engine = createGisEngine(spatialInfluenceQuestion, clock);

    expect(canSubmitAnswer(spatialInfluenceQuestion, [], "A")).toBe(false);
    engine.runBuffer();
    expect(canSubmitAnswer(spatialInfluenceQuestion, engine.getSnapshot().completedTools, null)).toBe(false);
    expect(canSubmitAnswer(spatialInfluenceQuestion, engine.getSnapshot().completedTools, "A")).toBe(true);
    expect(evaluateAnswer(spatialInfluenceQuestion, "A").isCorrect).toBe(true);
    expect(evaluateAnswer(spatialInfluenceQuestion, "B")).toMatchObject({
      selectedAnswer: "B",
      isCorrect: false,
      explanation: spatialInfluenceQuestion.explanation,
    });
  });

  it("keeps the product GIS registry broad without fake analytical runners", () => {
    expect(Object.keys(gisToolRegistry)).toEqual([
      "pan", "zoom", "search", "coordinate", "layer-control", "popup", "attribute-table",
      "buffer", "overlay", "distance", "filter", "symbology", "network",
      "administrative-layer", "swipe", "compare", "heatmap", "cluster", "transparency",
    ]);
    expect(Object.entries(gisToolRegistry).filter(([, tool]) => tool.run).map(([id]) => id)).toEqual(["buffer", "overlay"]);
  });
});
