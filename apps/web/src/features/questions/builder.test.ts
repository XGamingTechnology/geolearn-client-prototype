import {describe,expect,it} from "vitest";
import {configurationSummary,normalizeAnswers,stimulusControls,validateForPublish} from "./builder";

describe("question builder configuration",()=>{
  it("exposes only stimulus-dependent controls",()=>{
    expect(stimulusControls("text")).toEqual({media:false,datasets:false,mediaType:null});
    expect(stimulusControls("image")).toEqual({media:true,datasets:false,mediaType:"IMAGE"});
    expect(stimulusControls("video")).toEqual({media:true,datasets:false,mediaType:"VIDEO"});
    expect(stimulusControls("webgis")).toEqual({media:false,datasets:true,mediaType:null});
  });
  it("stores only three or four configured choices",()=>{
    expect(normalizeAnswers(["satu","dua","tiga","",""])).toEqual([{id:"A",label:"satu"},{id:"B",label:"dua"},{id:"C",label:"tiga"}]);
    expect(normalizeAnswers(["a","b","c","d",""])).toHaveLength(4);
  });
  it("renumbers choices after removal",()=>expect(normalizeAnswers(["A awal","C awal"])).toEqual([{id:"A",label:"A awal"},{id:"B",label:"C awal"}]));
  it("rejects a removed answer key",()=>expect(validateForPublish({stimulusType:"text",responseType:"multiple-choice",answers:[{id:"A",label:"a"},{id:"B",label:"b"}],correctAnswer:"C"})).toContain("Pilih jawaban benar yang masih tersedia."));
  it("rejects image without the correct media binding",()=>expect(validateForPublish({stimulusType:"image",responseType:"multiple-choice",answers:[{id:"A",label:"a"},{id:"B",label:"b"}],correctAnswer:"A"})).toContain("Pilih MediaAsset IMAGE untuk stimulus gambar."));
  it("rejects spatial response without WebGIS",()=>expect(validateForPublish({stimulusType:"text",responseType:"draw-point",answers:[]})).toContain("Spatial Response hanya dapat dipublish dengan stimulus WebGIS."));
  it("accepts and summarizes WebGIS buffer with multiple choice",()=>{
    const value={stimulusType:"webgis" as const,responseType:"multiple-choice" as const,answers:normalizeAnswers(["a","b","c","d"]),correctAnswer:"A",sourceDatasetId:"source",targetDatasetId:"target",requiredGisTool:"buffer",bufferDistance:500};
    expect(validateForPublish(value)).toEqual([]); expect(configurationSummary(value)).toBe("WEBGIS · BUFFER 500 M · MULTIPLE CHOICE · 4 PILIHAN");
  });
});
