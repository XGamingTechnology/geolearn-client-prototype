import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { saveMultipleChoiceResponse } from "@/server/assessment/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId}=await params;
    const body=await request.json() as {quizItemId?:string;answer?:string;durationMs?:number};
    await saveMultipleChoiceResponse({
      session,attemptId,
      quizItemId:String(body.quizItemId??""),
      answer:String(body.answer??""),
      durationMs:Number(body.durationMs??0),
    });
    // Do not expose correctness, score, correct-answer feedback, or any grading
    // signal while the attempt is still in progress. The server may grade for
    // persistence, but the student only receives an acknowledgement here.
    return NextResponse.json({saved:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Response rejected"},{status:400});
  }
}
