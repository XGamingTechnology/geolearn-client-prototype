import {NextRequest,NextResponse} from "next/server";
import {requireTeacherSession} from "@/server/auth/session";
import {getQuestionDatasetPreviewPayload,type QuestionDatasetRole,type QuestionDatasetSelection} from "@/server/content/question-datasets";

const supportedRoles=new Set<QuestionDatasetRole>(["SOURCE","TARGET","CONTEXT"]);

function parseBindings(value:unknown):QuestionDatasetSelection[]{
  if(!Array.isArray(value)||value.length>50)throw new Error("Dataset bindings tidak valid.");
  return value.map((item)=>{
    if(!item||typeof item!=="object")throw new Error("Dataset bindings tidak valid.");
    const source=item as {datasetId?:unknown;role?:unknown;label?:unknown};
    const datasetId=String(source.datasetId??"").trim();
    const role=String(source.role??"") as QuestionDatasetRole;
    if(!datasetId||!supportedRoles.has(role))throw new Error("Dataset bindings tidak valid.");
    let label:QuestionDatasetSelection["label"];
    if(source.label&&typeof source.label==="object"){
      const raw=source.label as {enabled?:unknown;field?:unknown;minZoom?:unknown};
      label={
        enabled:raw.enabled===true,
        field:typeof raw.field==="string"?raw.field:null,
        minZoom:Number(raw.minZoom??11),
      };
    }
    return {datasetId,role,label};
  });
}

export async function POST(request:NextRequest){
  try{
    const actor=await requireTeacherSession();
    const body=await request.json() as {bindings?:unknown};
    const bindings=parseBindings(body.bindings??[]);
    const payload=await getQuestionDatasetPreviewPayload(actor,bindings);
    return NextResponse.json(payload,{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Teacher map preview failed",error);
    return NextResponse.json({error:"Preview peta tidak tersedia."},{status:400});
  }
}
