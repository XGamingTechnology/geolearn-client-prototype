import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pg from "pg";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl) throw new Error("DATABASE_URL is required");

function derive(secret,salt){
  return new Promise((resolve,reject)=>{
    scrypt(secret,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key));
  });
}
async function hashSecret(secret){
  const salt=randomBytes(16);
  const key=await derive(secret,salt);
  return ["scrypt",16384,8,1,salt.toString("base64url"),key.toString("base64url")].join("$");
}
async function askHidden(rl,label){
  output.write(label);
  const wasRaw=Boolean(input.isRaw);
  if(input.setRawMode) input.setRawMode(true);
  let value="";
  await new Promise((resolve)=>{
    const onData=(chunk)=>{
      const text=chunk.toString();
      for(const char of text){
        if(char==="\r"||char==="\n"){output.write("\n");input.off("data",onData);if(input.setRawMode) input.setRawMode(wasRaw);resolve();return;}
        if(char==="\u0003"){process.exit(130);}
        if(char==="\u007f"){if(value.length){value=value.slice(0,-1);output.write("\b \b");}continue;}
        value+=char; output.write("*");
      }
    };
    input.on("data",onData);
  });
  return value;
}

const rl=createInterface({input,output});
try{
  console.info("GeoLearn one-time School Admin bootstrap");
  console.info("User credentials are prompted interactively and stored only as hashes in PostgreSQL.");
  const schoolName=(await rl.question("School name: ")).trim();
  const schoolCode=(await rl.question("School code: ")).trim();
  const displayName=(await rl.question("Admin display name: ")).trim();
  const email=(await rl.question("Admin email: ")).trim().toLowerCase();
  const password=await askHidden(rl,"Temporary admin password (min 12 chars): ");
  const confirm=await askHidden(rl,"Confirm password: ");
  if(!schoolName||!schoolCode||!displayName||!email) throw new Error("All fields are required");
  if(password!==confirm) throw new Error("Passwords do not match");
  if(password.length<12||password.length>512) throw new Error("Password must be 12-512 characters");

  const passwordHash=await hashSecret(password);
  const client=new pg.Client({connectionString:databaseUrl});
  await client.connect();
  try{
    await client.query("begin");
    const school=await client.query(
      `insert into schools(name,code,status) values($1,$2,'ACTIVE')
       on conflict ((lower(code))) do update set name=excluded.name,status='ACTIVE',updated_at=now()
       returning id`,
      [schoolName,schoolCode],
    );
    const schoolId=school.rows[0].id;
    const existing=await client.query("select id from staff_users where lower(email)=lower($1)",[email]);
    if(existing.rows[0]) throw new Error("Admin email already exists; use the account management UI to reset or edit it");

    const created=await client.query(
      `insert into staff_users(school_id,email,password_hash,role,status,must_change_password)
       values($1,$2,$3,'SCHOOL_ADMIN','ACTIVE',true) returning id`,
      [schoolId,email,passwordHash],
    );
    const staffUserId=created.rows[0].id;
    await client.query(
      "insert into teacher_profiles(staff_user_id,display_name,subject) values($1,$2,'Geografi')",
      [staffUserId,displayName],
    );
    await client.query(
      `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
       values($1,$2,'STAFF',$2,'CREATE',$3::jsonb)`,
      [schoolId,staffUserId,JSON.stringify({bootstrap:true,role:"SCHOOL_ADMIN"})],
    );
    await client.query("commit");
    console.info("School Admin created successfully.");
    console.info("School:",schoolCode);
    console.info("Admin:",email);
    console.info("Password was not stored in plaintext.");
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    await client.end();
  }
}finally{
  rl.close();
}
