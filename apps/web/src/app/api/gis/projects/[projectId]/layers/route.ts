import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { addDatasetToProject } from "@/server/data/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId}=await params;
    const body=await request.json() as {datasetId?:string};
    await addDatasetToProject(actor,projectId,String(body.datasetId??""));
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:"Unable to add layer"},{status:400});
  }
}
