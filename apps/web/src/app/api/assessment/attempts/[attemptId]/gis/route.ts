import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { recordGisActivity } from "@/server/assessment/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId}=await params;
    const body=await request.json() as {questionVersionId?:string;toolId?:string;actionType?:string;parameters?:Record<string,unknown>;resultSummary?:Record<string,unknown>};
    await recordGisActivity({
      session,attemptId,
      questionVersionId:String(body.questionVersionId??""),
      toolId:String(body.toolId??""),
      actionType:String(body.actionType??""),
      parameters:body.parameters,
      resultSummary:body.resultSummary,
    });
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:"GIS activity rejected"},{status:400});
  }
}
