export type StudentImportRow = { fullName:string; loginId?:string };

export function parseStudentCsv(input:string):StudentImportRow[]{
  const lines=input.replace(/^\uFEFF/,"").split(/\r?\n/).map((line)=>line.trim()).filter(Boolean);
  if(!lines.length) return [];
  const header=parseLine(lines[0]).map((value)=>value.trim().toLowerCase());
  const nameIndex=header.findIndex((value)=>["name","full_name","nama","nama_siswa"].includes(value));
  const idIndex=header.findIndex((value)=>["student_id","login_id","id_siswa","nis"].includes(value));
  if(nameIndex<0) throw new Error("CSV must contain name/full_name/nama column");
  if(lines.length>201) throw new Error("Maximum 200 students per import");

  return lines.slice(1).map((line,index)=>{
    const cols=parseLine(line);
    const fullName=(cols[nameIndex]??"").trim();
    const loginId=idIndex>=0?(cols[idIndex]??"").trim():"";
    if(!fullName) throw new Error(`Row ${index+2}: student name is required`);
    if(fullName.length>180) throw new Error(`Row ${index+2}: student name is too long`);
    if(loginId.length>128) throw new Error(`Row ${index+2}: student ID is too long`);
    return {fullName,...(loginId?{loginId}:{})};
  });
}

function parseLine(line:string):string[]{
  const values:string[]=[];
  let current="";
  let quoted=false;
  for(let i=0;i<line.length;i++){
    const char=line[i];
    if(char==='"'){
      if(quoted&&line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    }else if(char===","&&!quoted){
      values.push(current);current="";
    }else current+=char;
  }
  if(quoted) throw new Error("Invalid CSV quoting");
  values.push(current);
  return values;
}

export const STUDENT_CSV_TEMPLATE = "name,student_id\nAlya Prameswari,\nBima Aditya,GL-XI-002\n";
