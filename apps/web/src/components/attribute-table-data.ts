import type {Feature,FeatureCollection,GeoJsonObject,Geometry} from "geojson";

export type Scalar=string|number|boolean|null;
export type AttributeRow={feature:Feature<Geometry>;featureIndex:number;properties:Record<string,Scalar>};
export type FeatureExtraction={rows:AttributeRow[];warning:string|null};
export type AttributeLayer={datasetVersionId:string;geojson:GeoJsonObject};

function isScalar(value:unknown):value is Scalar{return value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean";}

/** Preserve each FeatureCollection index so filtering and sorting cannot change map identity. */
export function extractAttributeRows(geojson:GeoJsonObject):FeatureExtraction{
  const candidates:Feature<Geometry|null>[]=geojson.type==="FeatureCollection"
    ?(geojson as FeatureCollection<Geometry|null>).features
    :geojson.type==="Feature"?[geojson as Feature<Geometry|null>]:[];
  if(geojson.type!=="FeatureCollection"&&geojson.type!=="Feature")return {rows:[],warning:`GeoJSON ${geojson.type} tidak didukung oleh tabel atribut. Gunakan FeatureCollection atau Feature.`};
  let nullGeometryCount=0;
  const rows:AttributeRow[]=[];
  candidates.forEach((feature,featureIndex)=>{
    if(!feature.geometry){nullGeometryCount+=1;return;}
    rows.push({feature:feature as Feature<Geometry>,featureIndex,properties:Object.fromEntries(Object.entries(feature.properties??{}).filter(([,value])=>isScalar(value))) as Record<string,Scalar>});
  });
  return {rows,warning:nullGeometryCount?`${nullGeometryCount} feature tanpa geometri tidak dapat dipilih dan tidak ditampilkan.`:null};
}

export function featuresOf(geojson:GeoJsonObject):Feature<Geometry>[] {return extractAttributeRows(geojson).rows.map((row)=>row.feature);}
export function featureAt(geojson:GeoJsonObject,featureIndex:number):Feature<Geometry>|null{return extractAttributeRows(geojson).rows.find((row)=>row.featureIndex===featureIndex)?.feature??null;}
export function featureIndexOf(geojson:GeoJsonObject,feature:Feature<Geometry>):number{return extractAttributeRows(geojson).rows.find((row)=>row.feature===feature)?.featureIndex??-1;}
export function resolveActiveLayer<T extends AttributeLayer>(layers:T[],activeLayerId:string):T|null{return layers.find((layer)=>layer.datasetVersionId===activeLayerId)??layers[0]??null;}
