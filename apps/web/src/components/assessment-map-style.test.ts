import { describe, expect, it } from "vitest";
import { assessmentPathStyle, assessmentPointStyle } from "./assessment-map-style";

describe("assessment map geometry styles",()=>{
  it("renders SOURCE points as explicit, visible circle-marker options",()=>{
    expect(assessmentPointStyle("SOURCE",.8)).toMatchObject({color:"#2563eb",fillColor:"#60a5fa",radius:7,opacity:.8,fillOpacity:.6});
  });

  it("renders TARGET points with their role color and layer opacity",()=>{
    expect(assessmentPointStyle("TARGET",.5)).toMatchObject({color:"#0f766e",fillColor:"#2dd4bf",radius:7,opacity:.5,fillOpacity:.375});
  });

  it("keeps path styling for line and polygon GeoJSON",()=>{
    expect(assessmentPathStyle("SOURCE",.8)).toMatchObject({color:"#2563eb",weight:3,opacity:.8,fillOpacity:.2});
    expect(assessmentPathStyle("CONTEXT",.5)).toMatchObject({color:"#64748b",fillColor:"#cbd5e1",weight:1.5,opacity:.5,fillOpacity:.08});
  });
});
