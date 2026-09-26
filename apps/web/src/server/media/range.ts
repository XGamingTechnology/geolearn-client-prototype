export type MediaByteRange={start:number;end:number};

export function parseMediaRange(value:string|null,size:number):MediaByteRange|null|"invalid"{
  if(!value)return null;
  const match=value.match(/^bytes=(\d*)-(\d*)$/);
  if(!match||(!match[1]&&!match[2])||!Number.isInteger(size)||size<=0)return "invalid";
  if(!match[1]){
    const suffix=Number(match[2]);
    if(!Number.isInteger(suffix)||suffix<=0)return "invalid";
    return {start:Math.max(0,size-suffix),end:size-1};
  }
  const start=Number(match[1]);
  const requestedEnd=match[2]?Number(match[2]):size-1;
  if(!Number.isInteger(start)||!Number.isInteger(requestedEnd)||start<0||start>=size||requestedEnd<start)return "invalid";
  return {start,end:Math.min(requestedEnd,size-1)};
}
