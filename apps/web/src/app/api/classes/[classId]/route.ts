import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateClass } from "@/server/classes/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{classId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId}=await params;
    const form=await request.formData();
    await updateClass({
      actor,classId,
      name:String(form.get("name")??""),
      gradeLevel:String(form.get("gradeLevel")??""),
      academicYear:String(form.get("academicYear")??""),
      semester:String(form.get("semester")??""),
      status:String(form.get("status")??"ACTIVE"),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/classes/"+classId+"?status=updated"),303);
  }catch{
    const {classId}=await params;
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/classes/"+classId+"?status=error"),303);
  }
}
