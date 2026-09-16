import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createClass } from "@/server/classes/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const form=await request.formData();
    const classId=await createClass({
      actor,
      name:String(form.get("name")??""),
      gradeLevel:String(form.get("gradeLevel")??""),
      academicYear:String(form.get("academicYear")??""),
      semester:String(form.get("semester")??""),
    });
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/classes/"+classId),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/classes?status=error"),303);
  }
}
