import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateClass } from "@/server/classes/service";

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
    return NextResponse.redirect(new URL("/teacher/classes/"+classId+"?status=updated",request.url),303);
  }catch{
    const {classId}=await params;
    return NextResponse.redirect(new URL("/teacher/classes/"+classId+"?status=error",request.url),303);
  }
}
