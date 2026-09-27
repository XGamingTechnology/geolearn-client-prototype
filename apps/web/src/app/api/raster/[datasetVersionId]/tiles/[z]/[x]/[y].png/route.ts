import {NextRequest,NextResponse} from "next/server";
import {query} from "@/server/db";
import {safeRasterKey} from "@/server/data/raster-storage";
import {verifyRasterTileSignature} from "@/server/data/raster-runtime";
import {applyRasterRendering,rasterRendering,rescaleFromStatistics} from "@/server/data/raster-rendering";
import {normalizeRasterTileCoordinate} from "@/server/data/raster-tile-coordinate";

export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{datasetVersionId:string;z:string;x:string;y:string}>}){
  const {datasetVersionId,z,x,y}=await params;const search=request.nextUrl.searchParams;
  if(!verifyRasterTileSignature(datasetVersionId,search.get("expires"),search.get("sig")))return NextResponse.json({message:"Tautan tile tidak valid atau kedaluwarsa."},{status:403});
  const tileZ=normalizeRasterTileCoordinate(z);const tileX=normalizeRasterTileCoordinate(x);const tileY=normalizeRasterTileCoordinate(y,true);
  if(!tileZ||!tileX||!tileY)return NextResponse.json({message:"Koordinat tile tidak valid."},{status:400});
  const [version]=await query<{storageKey:string;schemaJson:Record<string,unknown>}>(`select storage_key as "storageKey",coalesce(schema_json,'{}'::jsonb) as "schemaJson" from dataset_versions where id=$1 and format='COG' and processing_status='READY' and status='PUBLISHED'`,[datasetVersionId]);
  if(!version)return NextResponse.json({message:"Raster tidak tersedia."},{status:404});let key:string;try{key=safeRasterKey(version.storageKey,"cog");}catch{return NextResponse.json({message:"Raster tidak tersedia."},{status:404});}
  const base=process.env.RASTER_SERVICE_URL??"http://raster:8000";const source=`/data/${key}`;const url=new URL(`${base}/cog/tiles/WebMercatorQuad/${tileZ}/${tileX}/${tileY}.png`);url.searchParams.set("url",source);
  const rendering=rasterRendering(version.schemaJson);
  if(rendering.bands.length===1&&!rendering.rescale.length){
    const statisticsUrl=new URL(`${base}/cog/statistics`);statisticsUrl.searchParams.set("url",source);statisticsUrl.searchParams.append("bidx",String(rendering.bands[0]));
    const response=await fetch(statisticsUrl,{signal:AbortSignal.timeout(30_000)}).catch(()=>null);
    if(response?.ok){const rescale=rescaleFromStatistics(await response.json().catch(()=>null),rendering.bands);if(rescale.length)rendering.rescale=rescale;}
  }
  applyRasterRendering(url,rendering);
  const raster=await fetch(url,{headers:{accept:"image/png"},signal:AbortSignal.timeout(30_000)}).catch(()=>null);if(!raster?.ok)return NextResponse.json({message:"Tile raster gagal dibuat."},{status:raster?.status===404?404:502});
  return new NextResponse(raster.body,{status:200,headers:{"content-type":raster.headers.get("content-type")??"image/png","cache-control":"private, max-age=3600"}});
}
