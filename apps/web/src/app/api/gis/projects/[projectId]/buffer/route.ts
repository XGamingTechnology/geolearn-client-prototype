import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { runBufferAnalysis } from "@/server/data/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId}=await params;
    const body=await request.json() as {datasetVersionId?:string;distanceMeters?:number};
    const result=await runBufferAnalysis(actor,projectId,String(body.datasetVersionId??""),Number(body.distanceMeters??0));
    return NextResponse.json(result);
  }catch{
    return NextResponse.json({error:"Buffer failed"},{status:400});
  }
}
