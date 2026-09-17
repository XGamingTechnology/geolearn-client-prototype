import { describe, expect, it } from "vitest";

import { assessmentPointStyle } from "./assessment-map-style";

describe("assessmentPointStyle", () => {
  it("returns deterministic fill opacity values", () => {
    expect(assessmentPointStyle("SOURCE", 0.8).fillOpacity).toBe(0.6);
    expect(assessmentPointStyle("TARGET", 0.5).fillOpacity).toBe(0.375);
  });
});
