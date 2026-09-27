import { describe, expect, it } from "vitest";
import {
  clampSliderPosition,
  isSliderExperience,
  sliderRoleAssignment,
} from "./map-swipe";

describe("map swipe helpers", () => {
  it("clamps presentation position to 0–100", () => {
    expect(clampSliderPosition(-5)).toBe(0);
    expect(clampSliderPosition(42)).toBe(42);
    expect(clampSliderPosition(105)).toBe(100);
    expect(clampSliderPosition(Number.NaN)).toBe(50);
  });
  it("recognizes only the slider experience", () =>
    expect([
      isSliderExperience("slider"),
      isSliderExperience("compare"),
    ]).toEqual([true, false]));
  it("assigns SOURCE, TARGET and any CONTEXT independently", () => {
    const roles = sliderRoleAssignment([
      { role: "SOURCE", id: 1 },
      { role: "TARGET", id: 2 },
      { role: "CONTEXT", id: 3 },
      { role: "CONTEXT", id: 4 },
    ]);
    expect(roles.source.map((x) => x.id)).toEqual([1]);
    expect(roles.target.map((x) => x.id)).toEqual([2]);
    expect(roles.context).toHaveLength(2);
  });
  it.each([
    ["VECTOR", "VECTOR"],
    ["VECTOR", "RASTER"],
    ["RASTER", "VECTOR"],
    ["RASTER", "RASTER"],
  ] as const)("preserves the %s/%s slider architecture",(sourceKind,targetKind)=>{
    const roles=sliderRoleAssignment([
      {role:"SOURCE",dataKind:sourceKind,id:"before"},
      {role:"TARGET",dataKind:targetKind,id:"after"},
    ]);
    expect(roles.source).toEqual([{role:"SOURCE",dataKind:sourceKind,id:"before"}]);
    expect(roles.target).toEqual([{role:"TARGET",dataKind:targetKind,id:"after"}]);
  });
});
