import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { getStudentQuestionMedia } from "@/server/content/question-media";

export async function GET(_request:NextRequest,{params}:{params:Promise<{attemptId:string;questionVersionId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId,questionVersionId}=await params;
    const media=await getStudentQuestionMedia(session,attemptId,questionVersionId);
    return NextResponse.json({media},{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Media unavailable"},{status:404});
  }
}
