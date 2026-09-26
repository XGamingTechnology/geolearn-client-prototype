import { resolve, sep } from "node:path";

export const LOCAL_MEDIA_KEY=/^media\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|mp4)$/i;

export function resolveMediaPath(root:string,key:string){
  if(!LOCAL_MEDIA_KEY.test(key))throw new Error("Invalid media storage key");
  const target=resolve(root,key);
  const normalizedRoot=resolve(root)+sep;
  if(!target.startsWith(normalizedRoot))throw new Error("Invalid media storage key");
  return target;
}

export function isInternalMediaKey(value:string|null):value is string{
  return Boolean(value&&LOCAL_MEDIA_KEY.test(value));
}

export function isLegacyMediaUrl(value:string|null):value is string{
  return Boolean(value&&(value.startsWith("https://")||value.startsWith("http://")||(value.startsWith("/")&&!value.startsWith("//"))));
}

export function mediaDeliveryUrl(id:string,key:string|null){
  return isInternalMediaKey(key)?`/api/media/${id}`:(isLegacyMediaUrl(key)?key:null);
}
