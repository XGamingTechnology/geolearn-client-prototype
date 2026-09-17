import "server-only";

import { database } from "@/server/db";
import { AuthorizationError } from "@/server/auth/authorization";
import type { TeacherSession } from "@/server/auth/session";
import { hasStaffPermission } from "@/server/auth/permissions";
import { mediaStorage, type MediaStorage } from "./storage";
import { validateMediaBytes } from "./validation";

async function scopeFor(actor:TeacherSession,value:string){
  if(value!=="PRIVATE"&&value!=="SCHOOL"&&value!=="SYSTEM")throw new Error("Scope tidak valid.");
  if(value==="SYSTEM"&&actor.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  if(value!=="SYSTEM"&&!actor.schoolId)throw new AuthorizationError();
  if(value==="SCHOOL"&&actor.role!=="SYSTEM_ADMIN"&&actor.role!=="SCHOOL_ADMIN"&&!(await hasStaffPermission(actor,"CONTENT_MANAGE_SCHOOL")))throw new AuthorizationError();
  return value;
}

export async function uploadMediaAsset(input:{actor:TeacherSession;title:string;scope:string;file:File},storage:MediaStorage=mediaStorage){
  const scope=await scopeFor(input.actor,input.scope); const title=input.title.trim();
  if(!title||title.length>220)throw new Error("Judul media wajib diisi.");
  const bytes=new Uint8Array(await input.file.arrayBuffer());
  const {mime,config}=validateMediaBytes(bytes,input.file.type);
  const stored=await storage.put(bytes,config.extension);
  try{
    const result=await database().query<{id:string}>(
      `insert into media_assets(school_id,owner_teacher_id,scope,title,media_type,storage_key,mime_type,size_bytes,metadata_json,status)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'ACTIVE') returning id`,
      [scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,title,config.mediaType,stored.key,mime,bytes.byteLength,JSON.stringify({originalFilename:input.file.name})],
    );
    const id=result.rows[0]?.id;if(!id)throw new Error("Media creation failed");return id;
  }catch(error){await storage.delete(stored.key);throw error;}
}
