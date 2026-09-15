import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { getAssessmentMapPayload } from "@/server/assessment/gis";

export async function GET(_request:NextRequest,{params}:{params:Promise<{attemptId:string;questionVersionId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId,questionVersionId}=await params;
    return NextResponse.json(await getAssessmentMapPayload(session,attemptId,questionVersionId),{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Map payload unavailable"},{status:404});
  }
}
