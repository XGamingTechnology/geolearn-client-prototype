import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { runDistanceAnalysis } from "@/server/data/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId}=await params;
    const body=await request.json() as {aVersionId?:string;bVersionId?:string};
    const result=await runDistanceAnalysis(actor,projectId,String(body.aVersionId??""),String(body.bVersionId??""));
    return NextResponse.json(result);
  }catch{
    return NextResponse.json({error:"Distance failed"},{status:400});
  }
}
