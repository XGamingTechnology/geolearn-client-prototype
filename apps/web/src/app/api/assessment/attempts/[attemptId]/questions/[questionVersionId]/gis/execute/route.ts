import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { executeAssessmentGisTool } from "@/server/assessment/gis";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string;questionVersionId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId,questionVersionId}=await params;
    const body=await request.json() as {toolId?:string};
    const result=await executeAssessmentGisTool(session,attemptId,questionVersionId,String(body.toolId??""));
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"GIS analysis failed"},{status:400});
  }
}
