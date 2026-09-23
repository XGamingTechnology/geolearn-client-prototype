import {describe,expect,it} from "vitest";
import {validateRasterBbox,validateXyzTemplate} from "./raster-validation";

describe("validateXyzTemplate",()=>{
  it("accepts a public HTTPS XYZ template",()=>{
    expect(validateXyzTemplate("https://tiles.example.org/{z}/{x}/{y}.png")).toBe("https://tiles.example.org/{z}/{x}/{y}.png");
  });

  it("requires XYZ placeholders and HTTPS",()=>{
    expect(()=>validateXyzTemplate("https://tiles.example.org/static.png")).toThrow(/\{z\}/);
    expect(()=>validateXyzTemplate("http://tiles.example.org/{z}/{x}/{y}.png")).toThrow(/HTTPS/);
  });

  it("rejects credential-like query parameters",()=>{
    expect(()=>validateXyzTemplate("https://tiles.example.org/{z}/{x}/{y}.png?token=secret")).toThrow(/tanpa API key atau token/);
    expect(()=>validateXyzTemplate("https://user:pass@tiles.example.org/{z}/{x}/{y}.png")).toThrow(/kredensial/);
  });
});

describe("validateRasterBbox",()=>{
  it("accepts a valid lon-lat extent",()=>{
    expect(validateRasterBbox([106.7,-6.4,107.1,-6.0])).toEqual([106.7,-6.4,107.1,-6.0]);
  });

  it("rejects reversed or out-of-range extents",()=>{
    expect(()=>validateRasterBbox([107,-6,106,-5])).toThrow(/Bounding box/);
    expect(()=>validateRasterBbox([-181,-6,106,-5])).toThrow(/Bounding box/);
  });
});
