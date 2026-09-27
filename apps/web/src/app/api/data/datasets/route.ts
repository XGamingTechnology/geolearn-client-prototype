import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publicRedirectUrl } from "@/server/http/public-url";
import { parseVectorUpload } from "@/server/data/vector-import";
import { persistImportedVector } from "@/server/data/vector-persist";
import {registerRemoteRasterDataset} from "@/server/data/raster-source";
import {createRasterKeys,removeRasterFile,validateRasterUpload,writeIncomingRaster} from "@/server/data/raster-storage";
import {ingestRaster,persistLocalRaster} from "@/server/data/raster-ingest";

function fallbackTitle(fileName:string){
  return fileName.replace(/\.(geojson|json|kml|kmz|zip)$/i,"");
}
function number(form:FormData,name:string){
  const value=Number(form.get(name));
  if(!Number.isFinite(value))throw new Error(`${name} tidak valid.`);
  return value;
}

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const kind=String(form.get("datasetKind")??"VECTOR");

    if(kind==="RASTER_UPLOAD"){
      const file=form.get("file");if(!(file instanceof File))throw new Error("Pilih file GeoTIFF terlebih dahulu.");validateRasterUpload(file);
      const keys=createRasterKeys();let converted=false;
      try{
        await writeIncomingRaster(file,keys.sourceKey);const metadata=await ingestRaster(keys.sourceKey,keys.targetKey);converted=true;
        const id=await persistLocalRaster({actor,title:String(form.get("title")??"").trim()||fallbackTitle(file.name),description:String(form.get("description")??""),scope:String(form.get("scope")??"PRIVATE"),targetKey:keys.targetKey,metadata,sourceLabel:String(form.get("sourceLabel")??""),sensor:String(form.get("sensor")??""),acquiredAt:String(form.get("acquiredAt")??""),temporalLabel:String(form.get("temporalLabel")??""),attribution:String(form.get("attribution")??"")});
        return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data/"+id),303);
      }catch(error){if(converted)await removeRasterFile(keys.targetKey).catch(()=>undefined);throw error;}finally{await removeRasterFile(keys.sourceKey).catch(()=>undefined);}
    }

    if(kind==="RASTER_XYZ"){
      const id=await registerRemoteRasterDataset({
        actor,
        title:String(form.get("title")??""),
        description:String(form.get("description")??""),
        scope:String(form.get("scope")??"PRIVATE"),
        tileUrl:String(form.get("tileUrl")??""),
        bbox:[number(form,"minLon"),number(form,"minLat"),number(form,"maxLon"),number(form,"maxLat")],
        attribution:String(form.get("attribution")??""),
        sourceLabel:String(form.get("sourceLabel")??""),
        sensor:String(form.get("sensor")??""),
        acquiredAt:String(form.get("acquiredAt")??""),
        temporalLabel:String(form.get("temporalLabel")??""),
      });
      return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data/"+id),303);
    }

    if(kind!=="VECTOR")throw new Error("Jenis dataset tidak didukung.");
    const file=form.get("file");
    if(!(file instanceof File))throw new Error("Pilih file dataset terlebih dahulu.");
    const imported=await parseVectorUpload(file);
    const id=await persistImportedVector({
      actor,
      title:String(form.get("title")??"").trim()||fallbackTitle(file.name),
      description:String(form.get("description")??""),
      scope:String(form.get("scope")??"PRIVATE"),
      imported,
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data/"+id),303);
  }catch(error){
    const message=error instanceof Error?error.message:"Dataset gagal disimpan.";
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data?status=error&message="+encodeURIComponent(message)),303);
  }
}
