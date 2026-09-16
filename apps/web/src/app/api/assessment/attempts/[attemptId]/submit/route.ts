import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { submitAttempt } from "@/server/assessment/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  const {attemptId}=await params;
  try{
    const session=await requireStudentSession();
    await submitAttempt(session,attemptId);
    return NextResponse.redirect(publicRedirectUrl(request,"/student/result?attempt="+attemptId),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/student/assessment/"+attemptId+"?status=error"),303);
  }
}
