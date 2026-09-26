import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { updateProjectLayerPresentation } from "@/server/data/layer-presentation";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string;layerId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId,layerId}=await params;
    const body=await request.json() as {visible?:boolean;opacity?:number;style?:unknown};
    await updateProjectLayerPresentation({
      actor,
      projectId,
      layerId,
      visible:body.visible,
      opacity:body.opacity,
      style:body.style,
    });
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to update layer"},
      {status:400},
    );
  }
}
