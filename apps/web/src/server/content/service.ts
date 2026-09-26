import { database, query } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import { spatialThinkingModes, type SpatialThinkingMode } from "@/features/questions/types";
import {answerIds,validateForPublish,type AnswerId, type StimulusType, type ResponseType} from "@/features/questions/builder";

export type ContentScope = "SYSTEM" | "SCHOOL" | "PRIVATE";
export type QuestionBankItem = {
  id:string; title:string; subject:string|null; topic:string|null; scope:ContentScope;
  ownerTeacherId:string|null; versionId:string|null; versionNumber:number|null;
  spatialMode:SpatialThinkingMode|null; difficulty:string|null; prompt:string|null;
  versionStatus:"DRAFT"|"PUBLISHED"|null; stimulusType:string|null; responseType:string|null;
};
export type CaseBankItem = {
  id:string; title:string; description:string|null; scope:ContentScope; ownerTeacherId:string|null;
  versionId:string|null; versionNumber:number|null; versionStatus:"DRAFT"|"PUBLISHED"|null;
};
export type MediaAssetRecord = {
  id:string; title:string; scope:ContentScope; ownerTeacherId:string|null;
  mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION"; storageKey:string|null;
  mimeType:string|null; sizeBytes:number|null; status:"ACTIVE"|"ARCHIVED";
};

async function canManageSchoolContent(session:TeacherSession){
  if(session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN") return true;
  return hasStaffPermission(session,"CONTENT_MANAGE_SCHOOL");
}

function assertScopeWrite(session:TeacherSession,scope:ContentScope){
  if(scope==="SYSTEM" && session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  if(scope!=="SYSTEM" && !session.schoolId) throw new AuthorizationError();
}

async function assertSchoolScopeWrite(session:TeacherSession,scope:ContentScope){
  assertScopeWrite(session,scope);
  if(scope==="SCHOOL" && !(await canManageSchoolContent(session))) throw new AuthorizationError();
}

export async function listQuestionBank(session:TeacherSession):Promise<QuestionBankItem[]>{
  if(!session.schoolId && session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  return query<QuestionBankItem>(
    `select q.id,q.title,q.subject,q.topic,q.scope,q.owner_teacher_id as "ownerTeacherId",
       qv.id as "versionId",qv.version_number as "versionNumber",qv.spatial_mode as "spatialMode",
       qv.difficulty,qv.prompt,qv.status as "versionStatus",
       qv.stimulus_config->>'type' as "stimulusType",
       qv.response_config->>'type' as "responseType"
     from questions q
     left join lateral (
       select * from question_versions x
       where x.question_id=q.id
       order by case x.status when 'DRAFT' then 0 else 1 end, x.version_number desc
       limit 1
     ) qv on true
     where q.status='ACTIVE'
       and (
         q.scope='SYSTEM'
         or (q.scope='SCHOOL' and q.school_id=$1)
         or (q.scope='PRIVATE' and q.owner_teacher_id=$2)
       )
     order by q.updated_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

function validateSpatialMode(value:string):SpatialThinkingMode{
  if(!(spatialThinkingModes as readonly string[]).includes(value)) throw new Error("Invalid spatial mode");
  return value as SpatialThinkingMode;
}

function validateScope(value:string):ContentScope{
  if(value!=="SYSTEM"&&value!=="SCHOOL"&&value!=="PRIVATE") throw new Error("Invalid scope");
  return value;
}

function validateStimulus(value:string):StimulusType{
  if(!["text","image","video","webgis"].includes(value)) throw new Error("Unsupported stimulus type");
  return value as StimulusType;
}

export async function createQuestionDraft(input:{
  actor:TeacherSession; title:string; subject?:string; topic?:string; scope:string;
  spatialMode:string; difficulty?:string; prompt:string; stimulusType:string;
  answers:Array<{id:"A"|"B"|"C"|"D"|"E";label:string}>; correctAnswer:"A"|"B"|"C"|"D"|"E"; responseType?:string;
  activityConfig?:Record<string,unknown>; validationConfig?:Record<string,unknown>; feedbackCorrect?:string; feedbackIncorrect?:string;
}):Promise<string>{
  const scope=validateScope(input.scope);
  await assertSchoolScopeWrite(input.actor,scope);
  const spatialMode=validateSpatialMode(input.spatialMode);
  const title=input.title.trim(); const prompt=input.prompt.trim();
  if(!title||title.length>220||!prompt) throw new Error("Title and prompt are required");
  const responseType=input.responseType??"multiple-choice";
  const spatialResponseTypes=["draw-point","draw-line","draw-polygon","feature-select"];
  validateStimulus(input.stimulusType);
  if(responseType==="multiple-choice"){
    if(input.answers.length>5 || input.answers.some((answer)=>!answer.label)||input.answers.some((answer,index)=>answer.id!==answerIds[index])) throw new Error("Invalid answer config");
  }else if(!spatialResponseTypes.includes(responseType)){
    throw new Error("Unsupported response type");
  }

  const client=await database().connect();
  try{
    await client.query("begin");
    const q=await client.query<{id:string}>(
      `insert into questions(school_id,owner_teacher_id,scope,title,subject,topic,status)
       values($1,$2,$3,$4,$5,$6,'ACTIVE') returning id`,
      [scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,title,input.subject?.trim()||null,input.topic?.trim()||null],
    );
    const questionId=q.rows[0]?.id;
    if(!questionId) throw new Error("Question creation failed");
    await client.query(
      `insert into question_versions(question_id,version_number,spatial_mode,difficulty,prompt,
        stimulus_config,activity_config,response_config,validation_config,feedback_config,status,created_by)
       values($1,1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,'DRAFT',$10)`,
      [
        questionId,spatialMode,input.difficulty?.trim()||null,prompt,
        JSON.stringify({type:input.stimulusType}),
        JSON.stringify(input.activityConfig??{}),
        JSON.stringify(responseType==="multiple-choice"?{type:"multiple-choice",answers:input.answers}:{type:responseType}),
        JSON.stringify(responseType==="multiple-choice"?{method:"static-answer",correctAnswer:input.correctAnswer}:(input.validationConfig??{method:"manual-review"})),
        JSON.stringify({correct:input.feedbackCorrect??"",incorrect:input.feedbackIncorrect??""}),
        input.actor.staffUserId,
      ],
    );
    await client.query("commit");
    return questionId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

async function editableQuestion(session:TeacherSession,questionId:string){
  const [row]=await query<{id:string;school_id:string|null;owner_teacher_id:string|null;scope:ContentScope}>(
    "select id,school_id,owner_teacher_id,scope from questions where id=$1 and status='ACTIVE'",[questionId],
  );
  if(!row) throw new Error("Question not found");
  if(row.scope==="SYSTEM"){if(session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();}
  else if(row.scope==="SCHOOL"){
    if(row.school_id!==session.schoolId || !(await canManageSchoolContent(session))) throw new AuthorizationError();
  }else if(row.owner_teacher_id!==session.staffUserId) throw new AuthorizationError();
  return row;
}

export async function publishQuestionDraft(session:TeacherSession,questionId:string):Promise<void>{
  await editableQuestion(session,questionId);
  const [draft]=await query<{id:string;stimulusType:StimulusType;responseConfig:{type?:ResponseType;answers?:Array<{id:AnswerId;label:string}>};validationConfig:{correctAnswer?:string};activityConfig:{requiredActions?:Array<{tool?:string;parameters?:{distanceMeters?:number}}>}}>(
    `select id,stimulus_config->>'type' as "stimulusType",response_config as "responseConfig",validation_config as "validationConfig",activity_config as "activityConfig" from question_versions where question_id=$1 and status='DRAFT'
     order by version_number desc limit 1`,[questionId],
  );
  if(!draft) throw new Error("No draft version");
  const [datasets,media]=await Promise.all([
    query<{role:string}>("select role from question_version_dataset_layers where question_version_id=$1",[draft.id]),
    query<{mediaType:string}>("select ma.media_type as \"mediaType\" from question_version_media_assets qvm join media_assets ma on ma.id=qvm.media_asset_id where qvm.question_version_id=$1 and qvm.role='STIMULUS'",[draft.id]),
  ]);
  const action=draft.activityConfig.requiredActions?.[0];
  const errors=validateForPublish({stimulusType:draft.stimulusType,responseType:draft.responseConfig.type??"multiple-choice",answers:draft.responseConfig.answers??[],correctAnswer:draft.validationConfig.correctAnswer,mediaAssetId:media[0]?"bound":undefined,selectedMediaType:media[0]?.mediaType,sourceDatasetId:datasets.some(x=>x.role==="SOURCE")?"bound":undefined,targetDatasetId:datasets.some(x=>x.role==="TARGET")?"bound":undefined,requiredGisTool:action?.tool,bufferDistance:action?.parameters?.distanceMeters});
  if(errors.length) throw new Error(errors.join(" "));
  await query("update question_versions set status='PUBLISHED',published_at=now() where id=$1",[draft.id]);
}

export async function duplicateQuestion(session:TeacherSession,questionId:string):Promise<string>{
  const [source]=await query<{
    id:string;title:string;subject:string|null;topic:string|null;version_id:string;
    spatial_mode:string;difficulty:string|null;prompt:string;stimulus_config:unknown;activity_config:unknown;
    response_config:unknown;validation_config:unknown;feedback_config:unknown;
  }>(
    `select q.id,q.title,q.subject,q.topic,qv.id as version_id,qv.spatial_mode,qv.difficulty,qv.prompt,
       qv.stimulus_config,qv.activity_config,qv.response_config,qv.validation_config,qv.feedback_config
     from questions q join lateral (
       select * from question_versions v where v.question_id=q.id and v.status='PUBLISHED'
       order by v.version_number desc limit 1
     ) qv on true
     where q.id=$1 and q.status='ACTIVE'
       and (q.scope='SYSTEM' or (q.scope='SCHOOL' and q.school_id=$2) or (q.scope='PRIVATE' and q.owner_teacher_id=$3))`,
    [questionId,session.schoolId,session.staffUserId],
  );
  if(!source) throw new AuthorizationError();
  if(!session.schoolId) throw new AuthorizationError();

  const client=await database().connect();
  try{
    await client.query("begin");
    const q=await client.query<{id:string}>(
      `insert into questions(school_id,owner_teacher_id,scope,title,subject,topic,status,forked_from_question_version_id)
       values($1,$2,'PRIVATE',$3,$4,$5,'ACTIVE',$6) returning id`,
      [session.schoolId,session.staffUserId,`${source.title} — Salinan`,source.subject,source.topic,source.version_id],
    );
    const newId=q.rows[0]?.id;
    if(!newId) throw new Error("Duplicate failed");
    await client.query(
      `insert into question_versions(question_id,version_number,spatial_mode,difficulty,prompt,stimulus_config,
       activity_config,response_config,validation_config,feedback_config,status,created_by)
       values($1,1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,'DRAFT',$10)`,
      [newId,source.spatial_mode,source.difficulty,source.prompt,JSON.stringify(source.stimulus_config),JSON.stringify(source.activity_config),
       JSON.stringify(source.response_config),JSON.stringify(source.validation_config),JSON.stringify(source.feedback_config),session.staffUserId],
    );
    await client.query("commit");
    return newId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listCaseBank(session:TeacherSession):Promise<CaseBankItem[]>{
  return query<CaseBankItem>(
    `select c.id,c.title,c.description,c.scope,c.owner_teacher_id as "ownerTeacherId",
       cv.id as "versionId",cv.version_number as "versionNumber",cv.status as "versionStatus"
     from cases c
     left join lateral (
       select * from case_versions x where x.case_id=c.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) cv on true
     where c.status='ACTIVE' and (
       c.scope='SYSTEM' or (c.scope='SCHOOL' and c.school_id=$1) or (c.scope='PRIVATE' and c.owner_teacher_id=$2)
     )
     order by c.updated_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function createCaseDraft(input:{actor:TeacherSession;title:string;description:string;scope:string}):Promise<string>{
  const scope=validateScope(input.scope); await assertSchoolScopeWrite(input.actor,scope);
  const client=await database().connect();
  try{
    await client.query("begin");
    const result=await client.query<{id:string}>(
      `insert into cases(school_id,owner_teacher_id,scope,title,description,status)
       values($1,$2,$3,$4,$5,'ACTIVE') returning id`,
      [scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,input.title.trim(),input.description.trim()||null],
    );
    const caseId=result.rows[0]?.id;if(!caseId) throw new Error("Case creation failed");
    await client.query(
      `insert into case_versions(case_id,version_number,status,narrative,map_config,stimulus_layout_config,created_by)
       values($1,1,'DRAFT',$2,'{}'::jsonb,'{}'::jsonb,$3)`,
      [caseId,input.description.trim()||null,input.actor.staffUserId],
    );
    await client.query("commit"); return caseId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listMediaBank(session:TeacherSession):Promise<MediaAssetRecord[]>{
  return query<MediaAssetRecord>(
    `select id,title,scope,owner_teacher_id as "ownerTeacherId",media_type as "mediaType",
       storage_key as "storageKey",mime_type as "mimeType",size_bytes::bigint::float8 as "sizeBytes",status
     from media_assets
     where status='ACTIVE' and (
       scope='SYSTEM' or (scope='SCHOOL' and school_id=$1) or (scope='PRIVATE' and owner_teacher_id=$2)
     )
     order by updated_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function createMediaAsset(input:{actor:TeacherSession;title:string;scope:string;mediaType:string;storageKey?:string;mimeType?:string}):Promise<string>{
  const scope=validateScope(input.scope); await assertSchoolScopeWrite(input.actor,scope);
  if(!["IMAGE","VIDEO"].includes(input.mediaType)) throw new Error("Format file tidak didukung.");
  const expectedMime=input.mediaType==="IMAGE"?["image/jpeg","image/png","image/webp"]:["video/mp4"];
  if(input.mimeType&&!expectedMime.includes(input.mimeType))throw new Error("Format file tidak didukung.");
  const storageKey=input.storageKey?.trim()??"";
  if(!/^https?:\/\//i.test(storageKey)&&!(storageKey.startsWith("/")&&!storageKey.startsWith("//")))throw new Error("URL media tidak valid.");
  if(!input.title.trim()||input.title.trim().length>220)throw new Error("Judul media wajib diisi.");
  const [row]=await query<{id:string}>(
    `insert into media_assets(school_id,owner_teacher_id,scope,title,media_type,storage_key,mime_type,status)
     values($1,$2,$3,$4,$5,$6,$7,'ACTIVE') returning id`,
    [scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,input.title.trim(),input.mediaType,storageKey,input.mimeType?.trim()||null],
  );
  if(!row) throw new Error("Media creation failed");
  return row.id;
}


export type QuestionEditorRecord = QuestionBankItem & {
  stimulusConfig:Record<string,unknown>|null;
  activityConfig:Record<string,unknown>|null;
  responseConfig:{type?:string;answers?:Array<{id:string;label:string}>}|null;
  validationConfig:{method?:string;correctAnswer?:string}|null;
  feedbackConfig:{correct?:string;incorrect?:string}|null;
};

export async function getQuestionEditor(session:TeacherSession,questionId:string):Promise<QuestionEditorRecord|null>{
  const [row]=await query<QuestionEditorRecord>(
    `select q.id,q.title,q.subject,q.topic,q.scope,q.owner_teacher_id as "ownerTeacherId",
       qv.id as "versionId",qv.version_number as "versionNumber",qv.spatial_mode as "spatialMode",
       qv.difficulty,qv.prompt,qv.status as "versionStatus",
       qv.stimulus_config->>'type' as "stimulusType",qv.response_config->>'type' as "responseType",
       qv.stimulus_config as "stimulusConfig",qv.activity_config as "activityConfig",
       qv.response_config as "responseConfig",qv.validation_config as "validationConfig",
       qv.feedback_config as "feedbackConfig"
     from questions q
     join lateral (
       select * from question_versions x where x.question_id=q.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) qv on true
     where q.id=$1 and q.status='ACTIVE' and (
       q.scope='SYSTEM' or (q.scope='SCHOOL' and q.school_id=$2) or (q.scope='PRIVATE' and q.owner_teacher_id=$3)
     )`,
    [questionId,session.schoolId,session.staffUserId],
  );
  return row??null;
}

export async function updateQuestionDraft(input:{
  actor:TeacherSession;questionId:string;title:string;subject:string;topic:string;
  spatialMode:string;difficulty:string;prompt:string;stimulusType:string;
  answers:Array<{id:"A"|"B"|"C"|"D"|"E";label:string}>;correctAnswer:"A"|"B"|"C"|"D"|"E";responseType?:string;
  feedbackCorrect:string;feedbackIncorrect:string; activityConfig?:Record<string,unknown>; validationConfig?:Record<string,unknown>;
}):Promise<void>{
  await editableQuestion(input.actor,input.questionId);
  const spatialMode=validateSpatialMode(input.spatialMode);
  const [draft]=await query<{id:string}>(
    "select id from question_versions where question_id=$1 and status='DRAFT' order by version_number desc limit 1",
    [input.questionId],
  );
  if(!draft) throw new Error("Published question is immutable. Create a new draft version first.");
  const responseType=input.responseType??"multiple-choice";
  const spatialResponseTypes=["draw-point","draw-line","draw-polygon","feature-select"];
  validateStimulus(input.stimulusType);
  if(responseType==="multiple-choice"){
    if(input.answers.length>5 || input.answers.some((answer)=>!answer.label)||input.answers.some((answer,index)=>answer.id!==answerIds[index])) throw new Error("Invalid answer config");
  }else if(!spatialResponseTypes.includes(responseType)){
    throw new Error("Unsupported response type");
  }
  await query("update questions set title=$2,subject=$3,topic=$4,updated_at=now() where id=$1",[
    input.questionId,input.title.trim(),input.subject.trim()||null,input.topic.trim()||null,
  ]);
  await query(
    `update question_versions set spatial_mode=$2,difficulty=$3,prompt=$4,
       stimulus_config=$5::jsonb,activity_config=$6::jsonb,response_config=$7::jsonb,validation_config=$8::jsonb,
       feedback_config=$9::jsonb where id=$1`,
    [draft.id,spatialMode,input.difficulty.trim()||null,input.prompt.trim(),
     JSON.stringify({type:input.stimulusType}),
     JSON.stringify(input.activityConfig??{}),
     JSON.stringify(responseType==="multiple-choice"?{type:"multiple-choice",answers:input.answers}:{type:responseType}),
     JSON.stringify(responseType==="multiple-choice"?{method:"static-answer",correctAnswer:input.correctAnswer}:(input.validationConfig??{method:"manual-review"})),
     JSON.stringify({correct:input.feedbackCorrect,incorrect:input.feedbackIncorrect})],
  );
}

export async function createNextQuestionDraft(session:TeacherSession,questionId:string):Promise<void>{
  await editableQuestion(session,questionId);
  const [existing]=await query<{id:string}>("select id from question_versions where question_id=$1 and status='DRAFT' limit 1",[questionId]);
  if(existing) return;
  const [source]=await query<{
    version_number:number;case_version_id:string|null;spatial_mode:string;difficulty:string|null;bloom_level:string|null;prompt:string;
    stimulus_config:unknown;activity_config:unknown;response_config:unknown;validation_config:unknown;feedback_config:unknown;
  }>(
    `select version_number,case_version_id,spatial_mode,difficulty,bloom_level,prompt,stimulus_config,activity_config,
       response_config,validation_config,feedback_config
     from question_versions where question_id=$1 and status='PUBLISHED' order by version_number desc limit 1`,
    [questionId],
  );
  if(!source) throw new Error("No published source version");
  await query(
    `insert into question_versions(question_id,version_number,case_version_id,spatial_mode,difficulty,bloom_level,prompt,
       stimulus_config,activity_config,response_config,validation_config,feedback_config,status,created_by)
     values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,'DRAFT',$13)`,
    [questionId,source.version_number+1,source.case_version_id,source.spatial_mode,source.difficulty,source.bloom_level,source.prompt,
     JSON.stringify(source.stimulus_config),JSON.stringify(source.activity_config),JSON.stringify(source.response_config),
     JSON.stringify(source.validation_config),JSON.stringify(source.feedback_config),session.staffUserId],
  );
}


export type CaseDetailRecord = CaseBankItem & {
  narrative:string|null; mapConfig:Record<string,unknown>|null; stimulusLayoutConfig:Record<string,unknown>|null;
};
export async function getCaseDetail(session:TeacherSession,caseId:string):Promise<CaseDetailRecord|null>{
  const [row]=await query<CaseDetailRecord>(
    `select c.id,c.title,c.description,c.scope,c.owner_teacher_id as "ownerTeacherId",
       cv.id as "versionId",cv.version_number as "versionNumber",cv.status as "versionStatus",
       cv.narrative,cv.map_config as "mapConfig",cv.stimulus_layout_config as "stimulusLayoutConfig"
     from cases c join lateral (
       select * from case_versions x where x.case_id=c.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) cv on true
     where c.id=$1 and c.status='ACTIVE' and (
       c.scope='SYSTEM' or (c.scope='SCHOOL' and c.school_id=$2) or (c.scope='PRIVATE' and c.owner_teacher_id=$3)
     )`,
    [caseId,session.schoolId,session.staffUserId],
  );
  return row??null;
}
async function editableCase(session:TeacherSession,caseId:string){
  const [row]=await query<{school_id:string|null;owner_teacher_id:string|null;scope:ContentScope}>(
    "select school_id,owner_teacher_id,scope from cases where id=$1 and status='ACTIVE'",[caseId],
  );
  if(!row) throw new Error("Case not found");
  if(row.scope==="SYSTEM"){if(session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();}
  else if(row.scope==="SCHOOL"){
    if(row.school_id!==session.schoolId || !(await canManageSchoolContent(session))) throw new AuthorizationError();
  }else if(row.owner_teacher_id!==session.staffUserId) throw new AuthorizationError();
}
export async function publishCaseDraft(session:TeacherSession,caseId:string):Promise<void>{
  await editableCase(session,caseId);
  const [draft]=await query<{id:string}>(
    "select id from case_versions where case_id=$1 and status='DRAFT' order by version_number desc limit 1",[caseId],
  );
  if(!draft) throw new Error("No draft case version");
  await query("update case_versions set status='PUBLISHED',published_at=now() where id=$1",[draft.id]);
}
export async function duplicateCase(session:TeacherSession,caseId:string):Promise<string>{
  const source=await getCaseDetail(session,caseId);
  if(!source?.versionId || source.versionStatus!=="PUBLISHED" || !session.schoolId) throw new AuthorizationError();
  const client=await database().connect();
  try{
    await client.query("begin");
    const created=await client.query<{id:string}>(
      `insert into cases(school_id,owner_teacher_id,scope,title,description,status,forked_from_case_version_id)
       values($1,$2,'PRIVATE',$3,$4,'ACTIVE',$5) returning id`,
      [session.schoolId,session.staffUserId,`${source.title} — Salinan`,source.description,source.versionId],
    );
    const newId=created.rows[0]?.id;if(!newId) throw new Error("Duplicate failed");
    await client.query(
      `insert into case_versions(case_id,version_number,status,narrative,map_config,stimulus_layout_config,created_by)
       values($1,1,'DRAFT',$2,$3::jsonb,$4::jsonb,$5)`,
      [newId,source.narrative,JSON.stringify(source.mapConfig??{}),JSON.stringify(source.stimulusLayoutConfig??{}),session.staffUserId],
    );
    await client.query("commit");return newId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function getMediaAsset(session:TeacherSession,mediaId:string):Promise<MediaAssetRecord|null>{
  const [row]=await query<MediaAssetRecord>(
    `select id,title,scope,owner_teacher_id as "ownerTeacherId",media_type as "mediaType",
       storage_key as "storageKey",mime_type as "mimeType",size_bytes::bigint::float8 as "sizeBytes",status
     from media_assets where id=$1 and status='ACTIVE' and (
       scope='SYSTEM' or (scope='SCHOOL' and school_id=$2) or (scope='PRIVATE' and owner_teacher_id=$3)
     )`,
    [mediaId,session.schoolId,session.staffUserId],
  );
  return row??null;
}
