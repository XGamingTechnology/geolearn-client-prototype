import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createMediaAsset } from "@/server/content/service";
import { publicRedirectUrl } from "@/server/http/public-url";
import { uploadMediaAsset } from "@/server/media/upload";

export async function POST(request:NextRequest){
  try{
    const length=Number(request.headers.get("content-length")??0);
    if(length>101*1024*1024)throw new Error("Ukuran file melebihi batas.");
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const file=form.get("file");
    if(file instanceof File&&file.size>0)await uploadMediaAsset({actor,title:String(form.get("title")??""),scope:String(form.get("scope")??"PRIVATE"),file});
    else await createMediaAsset({actor,title:String(form.get("title")??""),scope:String(form.get("scope")??"PRIVATE"),mediaType:String(form.get("mediaType")??"IMAGE"),storageKey:String(form.get("externalUrl")??""),mimeType:String(form.get("mimeType")??"")});
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/media?status=created"),303);
  }catch(error){
    const detail=error instanceof Error?error.message:"";
    const message=["Format file tidak didukung.","Ukuran file melebihi batas.","Judul media wajib diisi.","URL media tidak valid."].includes(detail)?detail:"MediaAsset gagal dibuat.";
    return NextResponse.redirect(publicRedirectUrl(request,`/teacher/media?status=error&message=${encodeURIComponent(message)}`),303);
  }
}
