import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { uploadGeoJsonDataset } from "@/server/data/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File) || file.size===0 || file.size>10*1024*1024){
      return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data?status=error"),303);
    }
    const parsed=JSON.parse(await file.text()) as unknown;
    const id=await uploadGeoJsonDataset({
      actor,
      title:String(form.get("title")??file.name.replace(/\.geojson$|\.json$/i,"")),
      description:String(form.get("description")??""),
      scope:String(form.get("scope")??"PRIVATE"),
      geojson:parsed,
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data/"+id),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/data?status=error"),303);
  }
}
