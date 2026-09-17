import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { LOCAL_MEDIA_KEY, isInternalMediaKey, isLegacyMediaUrl, mediaDeliveryUrl, resolveMediaPath } from "./storage-core";

export {LOCAL_MEDIA_KEY,isInternalMediaKey,isLegacyMediaUrl,mediaDeliveryUrl} from "./storage-core";

export type StoredMedia={key:string;absolutePath:string;size:number};
export interface MediaStorage {
  put(bytes:Uint8Array,extension:string):Promise<StoredMedia>;
  open(key:string,range?:{start:number;end:number}):Promise<{stream:ReturnType<typeof createReadStream>;size:number}>;
  exists(key:string):Promise<boolean>;
  delete(key:string):Promise<void>;
}

export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly root=process.env.MEDIA_STORAGE_PATH??"/var/lib/geolearn/media"){}
  private path(key:string){return resolveMediaPath(this.root,key);}
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
void LOCAL_MEDIA_KEY;
void isInternalMediaKey;
void isLegacyMediaUrl;
void mediaDeliveryUrl;
