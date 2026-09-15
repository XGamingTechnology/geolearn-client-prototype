import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { saveMultipleChoiceResponse } from "@/server/assessment/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId}=await params;
    const body=await request.json() as {quizItemId?:string;answer?:string;durationMs?:number};
    const result=await saveMultipleChoiceResponse({
      session,attemptId,
      quizItemId:String(body.quizItemId??""),
      answer:String(body.answer??""),
      durationMs:Number(body.durationMs??0),
    });
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Response rejected"},{status:400});
  }
}
