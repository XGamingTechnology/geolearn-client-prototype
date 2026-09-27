export type RasterRendering={bands:number[];rescale:Array<[number,number]>};
export type RasterBbox=[number,number,number,number];

export function leafletRasterBounds(bbox:RasterBbox):[[number,number],[number,number]]{
  if(!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw new Error("Extent raster tidak valid.");
  const south=Math.max(-85.05112878,bbox[1]);const north=Math.min(85.05112878,bbox[3]);
  if(south>=north)throw new Error("Extent raster berada di luar cakupan Web Mercator.");
  return [[south,bbox[0]],[north,bbox[2]]];
}

function finiteRange(value:unknown):[number,number]|null{
  if(!Array.isArray(value)||value.length!==2)return null;
  const [minimum,maximum]=value;
  return typeof minimum==="number"&&typeof maximum==="number"&&Number.isFinite(minimum)&&Number.isFinite(maximum)&&minimum<maximum?[minimum,maximum]:null;
}

export function rasterRendering(schemaJson:Record<string,unknown>):RasterRendering{
  const raster=schemaJson.raster&&typeof schemaJson.raster==="object"?schemaJson.raster as Record<string,unknown>:{};
  const rendering=raster.rendering&&typeof raster.rendering==="object"?raster.rendering as Record<string,unknown>:{};
  const bands=Array.isArray(rendering.bands)?rendering.bands.filter((band):band is number=>Number.isInteger(band)&&Number(band)>0):[];
  const rescale=Array.isArray(rendering.rescale)?rendering.rescale.map(finiteRange).filter((range):range is [number,number]=>range!==null):[];
  return {bands,rescale:rescale.length===bands.length?rescale:[]};
}

export function applyRasterRendering(url:URL,rendering:RasterRendering){
  for(const band of rendering.bands)url.searchParams.append("bidx",String(band));
  for(const [minimum,maximum] of rendering.rescale)url.searchParams.append("rescale",`${minimum},${maximum}`);
  return url;
}

export function rescaleFromStatistics(value:unknown,bands:number[]):Array<[number,number]>{
  if(!value||typeof value!=="object")return [];
  const stats=value as Record<string,unknown>;
  return bands.map((band)=>{
    const entry=stats[`b${band}`];if(!entry||typeof entry!=="object")return null;
    const record=entry as Record<string,unknown>;
    return finiteRange([record.percentile_2,record.percentile_98])??finiteRange([record.min,record.max]);
  }).filter((range):range is [number,number]=>range!==null);
}
