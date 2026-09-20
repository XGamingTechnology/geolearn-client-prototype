import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { createDigitizedDataset } from "@/server/data/digitize";

export async function POST(request:NextRequest,{params}:{params:Promise<{projectId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId}=await params;
    const body=await request.json() as {title?:string;geometry?:unknown;geometries?:unknown};
    const result=await createDigitizedDataset({
      actor,
      projectId,
      title:String(body.title??""),
      geometries:body.geometries??body.geometry,
    });
    return NextResponse.json({ok:true,...result});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to save digitized layer"},
      {status:400},
    );
  }
}
