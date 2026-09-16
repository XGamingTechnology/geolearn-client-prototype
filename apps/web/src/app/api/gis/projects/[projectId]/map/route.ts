import { NextRequest, NextResponse } from "next/server";
import { requireTeacherSession } from "@/server/auth/session";
import { datasetAsFeatureCollection, listProjectLayers } from "@/server/data/service";

export async function GET(_request:NextRequest,{params}:{params:Promise<{projectId:string}>}){
  try{
    const actor=await requireTeacherSession();
    const {projectId}=await params;
    const layers=await listProjectLayers(actor,projectId);
    const payload=await Promise.all(layers.map(async(layer)=>({
      ...layer,
      geojson:await datasetAsFeatureCollection(actor,layer.datasetId),
    })));
    return NextResponse.json({layers:payload},{headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Unable to load GIS project map"},{status:404});
  }
}
