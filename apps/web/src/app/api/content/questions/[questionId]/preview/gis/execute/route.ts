import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {executeQuestionPreviewGis} from "@/server/content/question-preview-gis";

export async function POST(request:NextRequest,{params}:{params:Promise<{questionId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {questionId}=await params;
    const body=await request.json() as {toolId?:unknown};
    const result=await executeQuestionPreviewGis(actor,questionId,String(body.toolId??""));
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Analisis preview gagal dijalankan."},{status:400});
  }
}
