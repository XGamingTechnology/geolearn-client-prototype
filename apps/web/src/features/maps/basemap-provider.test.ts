import {describe,expect,it} from "vitest";
import {basemapIds} from "@/features/questions/experience";
import {basemapAvailability,resolveBasemap} from "./basemap-provider";

describe("basemap provider resolution",()=>{
  it("keeps Street and Terrain available without credentials",()=>{
    expect(basemapAvailability({})).toMatchObject({street:true,light:false,terrain:true,satellite:false});
    expect(resolveBasemap("street").provider).toBe("openstreetmap");
    expect(resolveBasemap("terrain").provider).toBe("opentopomap");
  });
  it("requires and URL-encodes the public CARTO key for Light",()=>{
    expect(resolveBasemap("light",{})).toMatchObject({id:"street",provider:"openstreetmap",fallbackFrom:"light"});
    const result=resolveBasemap("light",{cartoApiKey:"carto key&scope"});
    expect(basemapAvailability({cartoApiKey:"carto key&scope"}).light).toBe(true);
    expect(result).toMatchObject({id:"light",provider:"carto"});
    expect(result.url).toBe("https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=carto%20key%26scope");
  });
  it("prefers MapTiler Satellite when both provider keys are configured",()=>{
    const result=resolveBasemap("satellite",{arcgisApiKey:"arc key",mapTilerKey:"map key"});
    expect(result.provider).toBe("maptiler");expect(result.url).toContain("api.maptiler.com");
  });
  it("uses MapTiler Satellite when configured",()=>{
    expect(resolveBasemap("satellite",{mapTilerKey:"public-key"}).provider).toBe("maptiler");
    expect(basemapAvailability({mapTilerKey:"public-key"}).satellite).toBe(true);
  });
  it("uses ArcGIS World Imagery when only its key is configured",()=>{
    const result=resolveBasemap("satellite",{arcgisApiKey:"arc key"});
    expect(result.provider).toBe("arcgis");expect(basemapAvailability({arcgisApiKey:"arc key"}).satellite).toBe(true);expect(result.url).toContain("static-map-tiles-api.arcgis.com");expect(result.url).toContain("token=arc%20key");
  });
  it("safely renders Street for a saved Satellite default without providers",()=>{
    expect(resolveBasemap("satellite",{})).toMatchObject({id:"street",provider:"openstreetmap",fallbackFrom:"satellite"});
    expect(basemapAvailability({}).satellite).toBe(false);
  });
  it("normalizes unknown legacy defaults to Street",()=>expect(resolveBasemap("legacy-map").id).toBe("street"));
  it("keeps provider names out of the semantic QuestionVersion values",()=>{
    expect(basemapIds).toEqual(["street","light","terrain","satellite"]);
    expect(resolveBasemap("maptiler").id).toBe("street");
    expect(resolveBasemap("arcgis").id).toBe("street");
  });
});
