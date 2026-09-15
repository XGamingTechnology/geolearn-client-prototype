import { describe,expect,it } from "vitest";
import { parseStudentCsv } from "./csv";

describe("student CSV parser",()=>{
  it("supports generated IDs when student_id is blank",()=>{
    expect(parseStudentCsv("name,student_id\nAlya,\nBima,GL-XI-002")).toEqual([
      {fullName:"Alya"},
      {fullName:"Bima",loginId:"GL-XI-002"},
    ]);
  });

  it("supports quoted commas",()=>{
    expect(parseStudentCsv('nama,id_siswa\n"Putri, Ayu",GL-XI-003')).toEqual([
      {fullName:"Putri, Ayu",loginId:"GL-XI-003"},
    ]);
  });

  it("requires a name column",()=>{
    expect(()=>parseStudentCsv("student_id\nGL-001")).toThrow(/name/);
  });
});
