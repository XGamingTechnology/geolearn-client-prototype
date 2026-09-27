import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {runQuestionBulkAction,type QuestionBulkAction} from "@/server/content/question-bank-bulk";

const actions=new Set<QuestionBulkAction>(["delete","archive","restore"]);

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const body=await request.json() as {action?:unknown;ids?:unknown;selectAllFiltered?:unknown;filter?:unknown};
    if(typeof body.action!=="string"||!actions.has(body.action as QuestionBulkAction))return NextResponse.json({error:"Bulk action tidak valid."},{status:400});
    const result=await runQuestionBulkAction({
      actor,
      action:body.action as QuestionBulkAction,
      ids:body.ids,
      selectAllFiltered:body.selectAllFiltered===true,
      filter:body.filter,
    });
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Bulk action gagal."},{status:400});
  }
}
