import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { publishQuestionDraft } from "@/server/content/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    await publishQuestionDraft(actor,questionId);
    return NextResponse.redirect(new URL("/teacher/questions/"+questionId+"?status=published",request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/questions/"+questionId+"?status=error",request.url),303);
  }
}
