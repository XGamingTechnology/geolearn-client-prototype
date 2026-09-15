import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { saveSpatialResponse } from "@/server/assessment/spatial-response";

export async function POST(request:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  try{
    const session=await requireStudentSession();
    const {attemptId}=await params;
    const body=await request.json() as {
      quizItemId?:string;
      responseType?:"draw-point"|"draw-line"|"draw-polygon"|"feature-select";
      geometry?:unknown;
      selectedFeatureIds?:string[];
      durationMs?:number;
    };
    const responseType=body.responseType;
    if(!responseType||!["draw-point","draw-line","draw-polygon","feature-select"].includes(responseType)){
      return NextResponse.json({error:"Invalid spatial response type"},{status:400});
    }
    const result=await saveSpatialResponse({
      session,attemptId,
      quizItemId:String(body.quizItemId??""),
      responseType,
      geometry:body.geometry,
      selectedFeatureIds:body.selectedFeatureIds,
      durationMs:Number(body.durationMs??0),
    });
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Spatial response rejected"},{status:400});
  }
}
