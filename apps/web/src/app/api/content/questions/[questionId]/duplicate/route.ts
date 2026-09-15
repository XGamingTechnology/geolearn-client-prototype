import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { duplicateQuestion } from "@/server/content/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    const newId=await duplicateQuestion(actor,questionId);
    return NextResponse.redirect(new URL("/teacher/questions/"+newId,request.url),303);
  }catch{
    return NextResponse.redirect(new URL("/teacher/questions?status=error",request.url),303);
  }
}
