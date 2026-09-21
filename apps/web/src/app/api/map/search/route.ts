import {NextRequest,NextResponse} from "next/server";

const NOMINATIM_SEARCH="https://nominatim.openstreetmap.org/search";

type NominatimResult={
  place_id:number;
  display_name:string;
  lat:string;
  lon:string;
  type?:string;
  class?:string;
};

export async function GET(request:NextRequest){
  const q=(request.nextUrl.searchParams.get("q")??"").trim();
  if(q.length<2||q.length>120){
    return NextResponse.json({results:[],error:"Masukkan nama tempat minimal 2 karakter."},{status:400});
  }

  try{
    const url=new URL(NOMINATIM_SEARCH);
    url.searchParams.set("format","jsonv2");
    url.searchParams.set("limit","5");
    url.searchParams.set("addressdetails","0");
    url.searchParams.set("q",q);

    const response=await fetch(url,{headers:{
      Accept:"application/json",
      "Accept-Language":"id,en;q=0.8",
      "User-Agent":"GeoLearn/1.0 educational WebGIS (github.com/XGamingTechnology/geolearn-client-prototype)",
    },cache:"no-store"});

    if(!response.ok)throw new Error(`Nominatim ${response.status}`);
    const raw=await response.json() as NominatimResult[];
    const results=raw.map((item)=>({
      id:String(item.place_id),
      label:item.display_name,
      lat:Number(item.lat),
      lon:Number(item.lon),
      type:item.type??item.class??null,
    })).filter((item)=>Number.isFinite(item.lat)&&Number.isFinite(item.lon));

    return NextResponse.json({results});
  }catch(error){
    console.error("Map place search failed",error);
    return NextResponse.json({results:[],error:"Pencarian tempat sedang tidak tersedia."},{status:502});
  }
}
