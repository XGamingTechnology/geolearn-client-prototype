import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { startOrResumeAttempt } from "@/server/assessment/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{assignmentId:string}>}){
  const {assignmentId}=await params;
  try{
    const session=await requireStudentSession();
    const attemptId=await startOrResumeAttempt(session,assignmentId);
    return NextResponse.redirect(new URL("/student/assessment/"+attemptId,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/student/tasks?status=error",request.url),303);
  }
}
