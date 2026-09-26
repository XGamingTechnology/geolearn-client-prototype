export type RasterBbox=[number,number,number,number];

export function validateXyzTemplate(value:string){
  const template=value.trim();
  if(template.length<12||template.length>2048)throw new Error("URL tile raster tidak valid.");
  for(const token of ["{z}","{x}","{y}"])if(!template.includes(token))throw new Error("URL XYZ wajib memuat {z}, {x}, dan {y}.");
  const probe=template.replaceAll("{z}","0").replaceAll("{x}","0").replaceAll("{y}","0").replaceAll("{s}","a");
  let parsed:URL;
  try{parsed=new URL(probe);}catch{throw new Error("URL tile raster tidak valid.");}
  if(parsed.protocol!=="https:")throw new Error("Raster XYZ wajib menggunakan HTTPS.");
  if(parsed.username||parsed.password)throw new Error("Jangan simpan kredensial pada URL raster.");
  const sensitive=new Set(["key","token","apikey","api_key","access_token","signature","sig","secret","password"]);
  if([...parsed.searchParams.keys()].some((name)=>sensitive.has(name.toLowerCase())))throw new Error("Foundation raster v1 hanya menerima endpoint XYZ publik tanpa API key atau token pada URL.");
  return template;
}

export function validateRasterBbox(values:RasterBbox):RasterBbox{
  const [minLon,minLat,maxLon,maxLat]=values;
  if(!values.every(Number.isFinite)||minLon < -180||maxLon>180||minLat < -90||maxLat>90||minLon>=maxLon||minLat>=maxLat)throw new Error("Bounding box raster tidak valid.");
  return values;
}
