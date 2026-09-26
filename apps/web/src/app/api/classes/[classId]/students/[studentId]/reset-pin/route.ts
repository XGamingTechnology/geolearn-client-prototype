import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { resetStudentPinForClass } from "@/server/classes/service";

export async function POST(_request:NextRequest,{params}:{params:Promise<{classId:string;studentId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId,studentId}=await params;
    const pin=await resetStudentPinForClass({actor,classId,studentId});
    return NextResponse.json({pin});
  }catch{
    return NextResponse.json({error:"Unable to reset PIN"},{status:400});
  }
}
