import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { datasetAsFeatureCollection } from "@/server/data/service";

export async function GET(_request:NextRequest,{params}:{params:Promise<{datasetId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {datasetId}=await params;
    const geojson=await datasetAsFeatureCollection(actor,datasetId);
    return NextResponse.json(geojson,{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Dataset not found"},{status:404});
  }
}
