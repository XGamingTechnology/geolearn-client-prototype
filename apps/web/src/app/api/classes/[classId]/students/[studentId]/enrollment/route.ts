import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { archiveEnrollment } from "@/server/classes/service";

export async function POST(_request:NextRequest,{params}:{params:Promise<{classId:string;studentId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId,studentId}=await params;
    await archiveEnrollment({actor,classId,studentId});
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:"Unable to remove enrollment"},{status:400});
  }
}
