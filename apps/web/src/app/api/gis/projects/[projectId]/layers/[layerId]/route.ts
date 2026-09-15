import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateProjectLayer } from "@/server/data/service";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string;layerId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId,layerId}=await params;
    const body=await request.json() as {visible?:boolean;opacity?:number};
    await updateProjectLayer(actor,projectId,layerId,body);
    return NextResponse.json({ok:true});
  }catch{
    return NextResponse.json({error:"Unable to update layer"},{status:400});
  }
}
