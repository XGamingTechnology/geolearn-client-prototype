import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createNextQuestionDraft } from "@/server/content/service";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    await createNextQuestionDraft(actor,questionId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=draft-created"),303);
  }catch{
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions/"+questionId+"?status=error"),303);
  }
}
