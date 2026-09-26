import {describe,expect,it} from "vitest";
import {basemapAvailability,resolveBasemap} from "./basemap-provider";

describe("basemap provider resolution",()=>{
  it("keeps street, light, and terrain providers available",()=>{
    expect(basemapAvailability({})).toMatchObject({street:true,light:true,terrain:true});
    expect(resolveBasemap("street").provider).toBe("openstreetmap");
    expect(resolveBasemap("light").provider).toBe("carto");
    expect(resolveBasemap("terrain").provider).toBe("opentopomap");
  });
  it("prefers ArcGIS World Imagery when its key is configured",()=>{
    const result=resolveBasemap("satellite",{arcgisApiKey:"arc key",mapTilerKey:"map key"});
    expect(result.provider).toBe("arcgis");expect(basemapAvailability({arcgisApiKey:"arc key"}).satellite).toBe(true);expect(result.url).toContain("static-map-tiles-api.arcgis.com");expect(result.url).toContain("token=arc%20key");
  });
  it("uses MapTiler Satellite when only its key is configured",()=>{
    expect(resolveBasemap("satellite",{mapTilerKey:"public-key"}).provider).toBe("maptiler");
    expect(basemapAvailability({mapTilerKey:"public-key"}).satellite).toBe(true);
  });
  it("safely renders Street for a saved Satellite default without providers",()=>{
    expect(resolveBasemap("satellite",{})).toMatchObject({id:"street",provider:"openstreetmap",fallbackFrom:"satellite"});
    expect(basemapAvailability({}).satellite).toBe(false);
  });
  it("normalizes unknown legacy defaults to Street",()=>expect(resolveBasemap("legacy-map").id).toBe("street"));
});
