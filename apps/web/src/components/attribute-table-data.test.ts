import {describe,expect,it} from "vitest";
import type {Feature,FeatureCollection,GeoJsonObject,Geometry} from "geojson";
import {extractAttributeRows,featureAt,featureIndexOf,resolveActiveLayer} from "./attribute-table-data";

function collection(type:"Point"|"LineString",count:number):FeatureCollection<Geometry>{return {type:"FeatureCollection",features:Array.from({length:count},(_,index)=>({type:"Feature",properties:{name:`Feature ${index}`,rank:count-index},geometry:type==="Point"?{type,coordinates:[101+index,1]}:{type,coordinates:[[101+index,1],[102+index,2]]}}))};}
describe("attribute table feature semantics",()=>{
  it("creates four rows for four Point Features",()=>expect(extractAttributeRows(collection("Point",4)).rows).toHaveLength(4));
  it("creates three rows for three LineString Features",()=>expect(extractAttributeRows(collection("LineString",3)).rows).toHaveLength(3));
  it("returns zero rows for an empty FeatureCollection",()=>expect(extractAttributeRows(collection("Point",0)).rows).toHaveLength(0));
  it("omits null geometry visibly while preserving original indexes",()=>{const value=collection("Point",2);const missing={type:"Feature",properties:{name:"missing"},geometry:null} as unknown as Feature<Geometry>;value.features.splice(1,0,missing);const result=extractAttributeRows(value);expect(result.rows.map((row)=>row.featureIndex)).toEqual([0,2]);expect(result.warning).toContain("1 feature tanpa geometri");expect(featureAt(value,2)?.properties?.name).toBe("Feature 1");});
  it("fails visibly for unsupported top-level geometry",()=>{const unsupported={type:"MultiPoint",coordinates:[[101,1],[102,2]]} as GeoJsonObject;const result=extractAttributeRows(unsupported);expect(result.rows).toEqual([]);expect(result.warning).toContain("tidak didukung");});
  it("falls back from a stale activeLayerId and updates for a new dataset",()=>{const first={datasetVersionId:"source",geojson:collection("Point",4),role:"SOURCE"};const second={datasetVersionId:"target",geojson:collection("LineString",3),role:"TARGET"};expect(resolveActiveLayer([first],"stale")?.datasetVersionId).toBe("source");expect(extractAttributeRows(resolveActiveLayer([second],"source")!.geojson).rows).toHaveLength(3);});
  it("supports SOURCE, TARGET, and CONTEXT vector layers",()=>{const layers=(["SOURCE","TARGET","CONTEXT"] as const).map((role,index)=>({datasetVersionId:role,role,geojson:collection("Point",index+1)}));for(const layer of layers)expect(resolveActiveLayer(layers,layer.datasetVersionId)?.role).toBe(layer.role);});
  it("keeps original featureIndex after search and sort",()=>{const value=collection("Point",4);const rows=extractAttributeRows(value).rows.filter((row)=>row.properties.name!=="Feature 1").sort((a,b)=>Number(a.properties.rank)-Number(b.properties.rank));expect(rows.map((row)=>row.featureIndex)).toEqual([3,2,0]);});
  it("maps a selected row back to the same spatial Feature",()=>{const value=collection("Point",4);const row=extractAttributeRows(value).rows[2];expect(featureAt(value,row.featureIndex)).toBe(row.feature);expect(featureIndexOf(value,row.feature)).toBe(row.featureIndex);});
});
