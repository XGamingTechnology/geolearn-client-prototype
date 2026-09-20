import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publicRedirectUrl } from "@/server/http/public-url";
import { parseVectorUpload } from "@/server/data/vector-import";
import { persistImportedVector } from "@/server/data/vector-persist";

function fallbackTitle(fileName:string){
  return fileName.replace(/\.(geojson|json|kml|kmz|zip)$/i,"");
}

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
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
    const message=error instanceof Error?error.message:"Upload dataset gagal.";
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data?status=error&message="+encodeURIComponent(message)),303);
  }
}
