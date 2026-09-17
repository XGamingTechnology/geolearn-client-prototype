import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

export const LOCAL_MEDIA_KEY=/^media\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|mp4)$/i;

export type StoredMedia={key:string;absolutePath:string;size:number};
export interface MediaStorage {
  put(bytes:Uint8Array,extension:string):Promise<StoredMedia>;
  open(key:string,range?:{start:number;end:number}):Promise<{stream:ReturnType<typeof createReadStream>;size:number}>;
  exists(key:string):Promise<boolean>;
  delete(key:string):Promise<void>;
}

export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly root=process.env.MEDIA_STORAGE_PATH??"/var/lib/geolearn/media"){}
  private path(key:string){
    if(!LOCAL_MEDIA_KEY.test(key)) throw new Error("Invalid media storage key");
    const target=resolve(this.root,key);
    const root=resolve(this.root)+sep;
    if(!target.startsWith(root)) throw new Error("Invalid media storage key");
    return target;
  }
  async put(bytes:Uint8Array,extension:string){
    if(!/^(jpg|png|webp|mp4)$/.test(extension)) throw new Error("Invalid media extension");
    const key=`media/${randomUUID()}.${extension}`;
    const absolutePath=this.path(key);
    await mkdir(resolve(this.root,"media"),{recursive:true});
    const file=await open(absolutePath,"wx",0o640);
    try{await file.writeFile(bytes);}finally{await file.close();}
    return {key,absolutePath,size:bytes.byteLength};
  }
  async open(key:string,range?:{start:number;end:number}){
    const absolutePath=this.path(key); const info=await stat(absolutePath);
    return {stream:createReadStream(absolutePath,range),size:info.size};
  }
  async exists(key:string){try{await stat(this.path(key));return true;}catch{return false;}}
  async delete(key:string){await rm(this.path(key),{force:true});}
}

export const mediaStorage:MediaStorage=new LocalMediaStorage();
export function isInternalMediaKey(value:string|null):value is string{return Boolean(value&&LOCAL_MEDIA_KEY.test(value));}
export function isLegacyMediaUrl(value:string|null):value is string{return Boolean(value&&(value.startsWith("https://")||value.startsWith("http://")||(value.startsWith("/")&&!value.startsWith("//"))));}
export function mediaDeliveryUrl(id:string,key:string|null){return isInternalMediaKey(key)?`/api/media/${id}`:(isLegacyMediaUrl(key)?key:null);}
