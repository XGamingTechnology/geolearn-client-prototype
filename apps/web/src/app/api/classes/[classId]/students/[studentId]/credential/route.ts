import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { setStudentCredentialStatus } from "@/server/classes/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{classId:string;studentId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {classId,studentId}=await params;
    const body=await request.json() as {enabled?:boolean};
    await setStudentCredentialStatus({actor,classId,studentId,enabled:Boolean(body.enabled)});
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:"Unable to update credential"},{status:400});
  }
}
