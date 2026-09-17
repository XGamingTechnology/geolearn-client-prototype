import { describe, expect, it } from "vitest";

import { assessmentPathStyle, assessmentPointStyle } from "./assessment-map-style";

describe("assessmentPointStyle", () => {
  it("returns deterministic fill opacity values", () => {
    expect(assessmentPointStyle("SOURCE", 0.8)).toMatchObject({
      color: "#2563eb", fillColor: "#60a5fa", opacity: 0.8, fillOpacity: 0.6, radius: 7,
    });
    expect(assessmentPointStyle("TARGET", 0.5).fillOpacity).toBe(0.375);
  });

  it("preserves the existing role-specific path styling", () => {
    expect(assessmentPathStyle("SOURCE", 0.8)).toMatchObject({ weight: 3, opacity: 0.8, fillOpacity: 0.2 });
    expect(assessmentPathStyle("TARGET", 0.5)).toMatchObject({ weight: 2, opacity: 0.5, fillOpacity: 0.11 });
    expect(assessmentPathStyle("CONTEXT", 0.5)).toMatchObject({ weight: 1.5, opacity: 0.5, fillOpacity: 0.08 });
  });
});
