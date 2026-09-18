export const SUPPORTED_MEDIA={
  "image/jpeg":{mediaType:"IMAGE",extension:"jpg",limitEnv:"MEDIA_MAX_IMAGE_BYTES",defaultLimit:10*1024*1024},
  "image/png":{mediaType:"IMAGE",extension:"png",limitEnv:"MEDIA_MAX_IMAGE_BYTES",defaultLimit:10*1024*1024},
  "image/webp":{mediaType:"IMAGE",extension:"webp",limitEnv:"MEDIA_MAX_IMAGE_BYTES",defaultLimit:10*1024*1024},
  "video/mp4":{mediaType:"VIDEO",extension:"mp4",limitEnv:"MEDIA_MAX_VIDEO_BYTES",defaultLimit:100*1024*1024},
} as const;

export type SupportedMime=keyof typeof SUPPORTED_MEDIA;

export function detectMediaMime(bytes:Uint8Array):SupportedMime|null{
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";
  if(bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i)=>bytes[i]===v))return "image/png";
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==="ftyp")return "video/mp4";
  return null;
}

function limitFor(mime:SupportedMime){
  const config=SUPPORTED_MEDIA[mime];
  const configured=Number(process.env[config.limitEnv]);
  return Number.isFinite(configured)&&configured>0?configured:config.defaultLimit;
}

export function validateMediaBytes(bytes:Uint8Array,browserMime:string){
  const mime=detectMediaMime(bytes);
  if(!mime||!(browserMime in SUPPORTED_MEDIA)||browserMime!==mime)throw new Error("Format file tidak didukung.");
  if(bytes.byteLength>limitFor(mime))throw new Error("Ukuran file melebihi batas.");
  return {mime,config:SUPPORTED_MEDIA[mime]};
}
