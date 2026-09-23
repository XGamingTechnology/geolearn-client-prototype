import {describe,expect,it} from "vitest";
import {
  configuredMapInteractions,legacyMapInteractions,mapInteractionsForActivityConfig,
  normalizeMapExperience,normalizeMapInteractions,recommendationForSpatialMode,
} from "./experience";

describe("adaptive spatial experience",()=>{
  it("keeps legacy questions on the existing full map interaction set",()=>{
    expect(mapInteractionsForActivityConfig({})).toEqual(legacyMapInteractions);
  });

  it("treats an explicit empty interaction list as intentional",()=>{
    expect(configuredMapInteractions({interactions:[]})).toEqual([]);
    expect(mapInteractionsForActivityConfig({interactions:[]})).toEqual([]);
  });

  it("drops unsupported interaction identifiers",()=>{
    expect(normalizeMapInteractions(["popup","attribute-table","network","popup"])).toEqual(["popup","attribute-table"]);
  });

  it("falls back to a supported map experience",()=>{
    expect(normalizeMapExperience("analysis")).toBe("analysis");
    expect(normalizeMapExperience("compare")).toBe("standard");
  });

  it("recommends a compare-oriented future experience for spatial analogies without pretending it is active",()=>{
    const recommendation=recommendationForSpatialMode("analogy");
    expect(recommendation.experience).toBe("standard");
    expect(recommendation.futureExperience).toBe("compare");
  });
});
