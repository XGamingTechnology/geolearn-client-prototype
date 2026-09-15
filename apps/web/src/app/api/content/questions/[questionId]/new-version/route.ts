import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createNextQuestionDraft } from "@/server/content/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    await createNextQuestionDraft(actor,questionId);
    return NextResponse.redirect(new URL("/teacher/questions/"+questionId+"?status=draft-created",request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/questions/"+questionId+"?status=error",request.url),303);
  }
}
