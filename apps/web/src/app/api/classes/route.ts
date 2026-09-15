import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createClass } from "@/server/classes/service";

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
    return NextResponse.redirect(new URL("/teacher/classes/"+classId,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/classes?status=error",request.url),303);
  }
}
