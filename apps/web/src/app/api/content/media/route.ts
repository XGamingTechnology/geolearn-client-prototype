import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createMediaAsset } from "@/server/content/service";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    await createMediaAsset({
      actor,
      title:String(form.get("title")??""),
      scope:String(form.get("scope")??"PRIVATE"),
      mediaType:String(form.get("mediaType")??"IMAGE"),
      storageKey:String(form.get("storageKey")??""),
      mimeType:String(form.get("mimeType")??""),
    });
    return NextResponse.redirect(new URL("/teacher/media?status=created",request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/media?status=error",request.url),303);
  }
}
