import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {saveTeacherResponseReview} from "@/server/assessment/teacher-review";
import {publicRedirectUrl} from "@/server/http/public-url";

export async function POST(request:NextRequest,{params}:{params:Promise<{responseId:string}>}){
  const {responseId}=await params;
  const form=await request.formData();
  const assignmentId=String(form.get("assignmentId")??"");
  const attemptId=String(form.get("attemptId")??"");
  try{
    const actor=await requireTeacherSession();
    await saveTeacherResponseReview({
      actor,
      responseId,
      finalScore:Number(form.get("finalScore")),
      feedback:String(form.get("feedback")??""),
    });
    const query=new URLSearchParams({assignment:assignmentId,attempt:attemptId,reviewStatus:"saved"});
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/results?"+query.toString()+"#attempt-review"),303);
  }catch(error){
    const message=error instanceof Error?error.message:"Review gagal disimpan.";
    const query=new URLSearchParams({assignment:assignmentId,attempt:attemptId,reviewStatus:"error",message});
    return NextResponse.redirect(publicRedirectUrl(request,"/teacher/results?"+query.toString()+"#attempt-review"),303);
  }
}
