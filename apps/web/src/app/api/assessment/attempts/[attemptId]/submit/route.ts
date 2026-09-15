import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { submitAttempt } from "@/server/assessment/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  const {attemptId}=await params;
  try{
    const session=await requireStudentSession();
    await submitAttempt(session,attemptId);
    return NextResponse.redirect(new URL("/student/result?attempt="+attemptId,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/student/assessment/"+attemptId+"?status=error",request.url),303);
  }
}
