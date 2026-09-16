import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { startOrResumeAttempt } from "@/server/assessment/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{assignmentId:string}>}){
  const {assignmentId}=await params;
  try{
    const session=await requireStudentSession();
    const attemptId=await startOrResumeAttempt(session,assignmentId);
    return NextResponse.redirect(publicRedirectUrl(request,"/student/assessment/"+attemptId),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/student/tasks?status=error"),303);
  }
}
