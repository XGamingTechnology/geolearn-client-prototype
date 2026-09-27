import {beforeEach,describe,expect,it} from "vitest";
import {safeRasterKey,validateRasterUpload} from "./raster-storage";
import {createSignedRasterTileTemplate,resolveRasterRuntime,verifyRasterTileSignature} from "./raster-runtime";
import {validateRasterMetadata} from "./raster-ingest";
import {isSupportedQuestionRasterFormat} from "@/server/content/question-datasets";
import {applyRasterRendering,leafletRasterBounds,rasterRendering,rescaleFromStatistics} from "./raster-rendering";

beforeEach(()=>{process.env.RASTER_TILE_SIGNING_SECRET="test-secret-that-is-definitely-at-least-32-bytes";});

describe("raster upload validation",()=>{
  it.each(["scene.tif","scene.tiff"])("accepts %s",name=>expect(()=>validateRasterUpload({name,size:10},100)).not.toThrow());
  it("rejects other extensions and oversized files",()=>{expect(()=>validateRasterUpload({name:"scene.jpg",size:10},100)).toThrow(/\.tif/);expect(()=>validateRasterUpload({name:"scene.tif",size:101},100)).toThrow(/melebihi/);});
  it("allows only controlled relative keys",()=>{expect(safeRasterKey("cog/123e4567-e89b-12d3-a456-426614174000.tif","cog")).toMatch(/^cog/);expect(()=>safeRasterKey("../secret.tif")).toThrow(/tidak aman/);expect(()=>safeRasterKey("/data/cog/a.tif")).toThrow(/tidak aman/);});
});

describe("raster runtime",()=>{
  const base={datasetVersionId:"version-a",schemaJson:{raster:{sourceMode:"LOCAL_COG",sensor:"S2"}},defaultStyle:{attributionText:"Source"}};
  it("returns a same-origin signed template for COG without a filesystem path",()=>{const value=resolveRasterRuntime({...base,format:"COG",storageKey:"cog/123e4567-e89b-12d3-a456-426614174000.tif"});expect(value?.tileUrl).toMatch(/^\/api\/raster\/version-a\/tiles\/\{z\}/);expect(JSON.stringify(value)).not.toContain("/var/lib");expect(JSON.stringify(value)).not.toContain("cog/123");});
  it("preserves remote XYZ",()=>expect(resolveRasterRuntime({...base,format:"XYZ",storageKey:"https://tiles.example/{z}/{x}/{y}.png"})?.tileUrl).toBe("https://tiles.example/{z}/{x}/{y}.png"));
  it("signs dataset and expiry and rejects tampering or expiration",()=>{const now=1_700_000_000;const template=createSignedRasterTileTemplate("version-a",now+100);const url=new URL(template,"https://local.test");const expiry=url.searchParams.get("expires");const sig=url.searchParams.get("sig");expect(verifyRasterTileSignature("version-a",expiry,sig,now)).toBe(true);expect(verifyRasterTileSignature("version-b",expiry,sig,now)).toBe(false);expect(verifyRasterTileSignature("version-a",String(now+101),sig,now)).toBe(false);expect(verifyRasterTileSignature("version-a",expiry,sig,now+101)).toBe(false);});
});

describe("COG contracts",()=>{
  it("allows XYZ and COG but rejects unsupported raster formats",()=>{expect(isSupportedQuestionRasterFormat("COG")).toBe(true);expect(isSupportedQuestionRasterFormat("XYZ")).toBe(true);expect(isSupportedQuestionRasterFormat("GeoTIFF")).toBe(false);});
  it("validates metadata used by DatasetVersion mapping",()=>expect(validateRasterMetadata({sourceCrs:"EPSG:32748",sourceSrid:32748,bboxSource:[1,2,3,4],bboxWgs84:[106,-7,107,-6],width:2,height:2,bandCount:1,dtypes:["uint16"],nodata:null,resolution:[10,10],driver:"GTiff",isCog:true,rendering:{bands:[1],mode:"grayscale"}}).bboxWgs84).toEqual([106,-7,107,-6]));
});

describe("analytical raster rendering",()=>{
  it("adds band and non-destructive display rescale parameters to TiTiler",()=>{const url=new URL("http://raster/cog/tiles/WebMercatorQuad/1/2/3.png?url=%2Fdata%2Fcog%2Fa.tif");applyRasterRendering(url,rasterRendering({raster:{rendering:{bands:[1],rescale:[[12.5,932.25]]}}}));expect(url.searchParams.getAll("bidx")).toEqual(["1"]);expect(url.searchParams.getAll("rescale")).toEqual(["12.5,932.25"]);});
  it("uses TiTiler percentiles and safely rejects incomplete ranges",()=>{expect(rescaleFromStatistics({b1:{min:-10,max:1000,percentile_2:2,percentile_98:800}},[1])).toEqual([[2,800]]);expect(rasterRendering({raster:{rendering:{bands:[1],rescale:[[5,5]]}}}).rescale).toEqual([]);});
  it("converts WGS84 bbox order to Leaflet latitude/longitude bounds",()=>{expect(leafletRasterBounds([106,-7,107,-6])).toEqual([[-7,106],[-6,107]]);expect(()=>leafletRasterBounds([107,-7,106,-6])).toThrow(/Extent/);});
});
