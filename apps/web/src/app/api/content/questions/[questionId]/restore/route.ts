import { NextRequest,NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { restoreArchivedQuestion } from "@/server/content/question-bank";
import { publicRedirectUrl } from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  const {questionId}=await params;
  try{
    const actor=await requireTeacherSession();
    await restoreArchivedQuestion(actor,questionId);
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions?status=restored"),303);
  }catch(error){
    const message=error instanceof Error?error.message:"Soal gagal dipulihkan.";
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/questions?lifecycle=ARCHIVED&status=error&message="+encodeURIComponent(message)),303);
  }
}
