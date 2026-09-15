import { NextResponse } from "next/server";
import { STUDENT_CSV_TEMPLATE } from "@/server/classes/csv";

export async function GET(){
  return new NextResponse(STUDENT_CSV_TEMPLATE,{
    headers:{
      "content-type":"text/csv; charset=utf-8",
      "content-disposition":'attachment; filename="geolearn-students-template.csv"',
      "cache-control":"no-store",
    },
  });
}
