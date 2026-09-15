import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { uploadGeoJsonDataset } from "@/server/data/service";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File) || file.size===0 || file.size>10*1024*1024){
      return NextResponse.redirect(new URL("/teacher/data?status=error",request.url),303);
    }
    const parsed=JSON.parse(await file.text()) as unknown;
    const id=await uploadGeoJsonDataset({
      actor,
      title:String(form.get("title")??file.name.replace(/\.geojson$|\.json$/i,"")),
      description:String(form.get("description")??""),
      scope:String(form.get("scope")??"PRIVATE"),
      geojson:parsed,
    });
    return NextResponse.redirect(new URL("/teacher/data/"+id,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/data?status=error",request.url),303);
  }
}
