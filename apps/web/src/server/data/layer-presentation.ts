import { query } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type GisLayerStyle={
  color?:string;
  fillColor?:string;
  weight?:number;
  fillOpacity?:number;
  radius?:number;
  markerShape?:"circle"|"square"|"diamond";
  dashArray?:""|"8 6"|"2 6";
};

const HEX=/^#[0-9a-fA-F]{6}$/;

function finiteNumber(value:unknown,name:string,min:number,max:number):number|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} tidak valid.`);
  return value;
}

function color(value:unknown,name:string):string|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=="string"||!HEX.test(value))throw new Error(`${name} harus berupa warna hex.`);
  return value.toLowerCase();
}

export function normalizeGisLayerStyle(value:unknown):GisLayerStyle{
  if(value===undefined||value===null)return {};
  if(typeof value!=="object"||Array.isArray(value))throw new Error("Style layer tidak valid.");
  const input=value as Record<string,unknown>;
  const style:GisLayerStyle={};
  const stroke=color(input.color,"Warna garis/marker");
  const fill=color(input.fillColor,"Warna isi");
  const weight=finiteNumber(input.weight,"Ketebalan garis",1,12);
  const fillOpacity=finiteNumber(input.fillOpacity,"Opacity isi",0,1);
  const radius=finiteNumber(input.radius,"Ukuran marker",3,24);
  if(stroke!==undefined)style.color=stroke;
  if(fill!==undefined)style.fillColor=fill;
  if(weight!==undefined)style.weight=weight;
  if(fillOpacity!==undefined)style.fillOpacity=fillOpacity;
  if(radius!==undefined)style.radius=radius;
  if(input.markerShape!==undefined){
    if(input.markerShape!=="circle"&&input.markerShape!=="square"&&input.markerShape!=="diamond")throw new Error("Bentuk marker tidak valid.");
    style.markerShape=input.markerShape;
  }
  if(input.dashArray!==undefined){
    if(input.dashArray!==""&&input.dashArray!=="8 6"&&input.dashArray!=="2 6")throw new Error("Pola garis tidak valid.");
    style.dashArray=input.dashArray;
  }
  return style;
}

export async function updateProjectLayerPresentation(input:{
  actor:TeacherSession;
  projectId:string;
  layerId:string;
  visible?:boolean;
  opacity?:number;
  style?:unknown;
}):Promise<void>{
  const [project]=await query<{schoolId:string;ownerTeacherId:string}>(
    `select school_id as "schoolId",owner_teacher_id as "ownerTeacherId"
     from gis_projects where id=$1 and status='DRAFT'`,
    [input.projectId],
  );
  if(!project||project.schoolId!==input.actor.schoolId||project.ownerTeacherId!==input.actor.staffUserId)throw new AuthorizationError();

  if(input.visible!==undefined&&typeof input.visible!=="boolean")throw new Error("Visibilitas tidak valid.");
  let opacity:number|null=null;
  if(input.opacity!==undefined){
    if(typeof input.opacity!=="number"||!Number.isFinite(input.opacity)||input.opacity<0||input.opacity>1)throw new Error("Opacity tidak valid.");
    opacity=input.opacity;
  }
  const style=input.style===undefined?null:normalizeGisLayerStyle(input.style);

  const rows=await query<{id:string}>(
    `update gis_project_layers
     set visible=coalesce($3,visible),
         opacity=coalesce($4,opacity),
         style_json=coalesce($5::jsonb,style_json)
     where project_id=$1 and id=$2
     returning id`,
    [input.projectId,input.layerId,input.visible??null,opacity,style===null?null:JSON.stringify(style)],
  );
  if(!rows[0])throw new Error("Layer tidak ditemukan.");
}
