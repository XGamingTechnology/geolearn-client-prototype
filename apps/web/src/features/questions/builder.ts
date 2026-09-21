export const answerIds=["A","B","C","D","E"] as const;
export type AnswerId=(typeof answerIds)[number];
export type StimulusType="text"|"image"|"video"|"webgis";
export type ResponseType="multiple-choice"|"draw-point"|"draw-line"|"draw-polygon"|"feature-select";
export type DatasetRole="SOURCE"|"TARGET"|"CONTEXT";
export type GisTool="buffer"|"overlay"|"distance";
export type DatasetSelection={datasetId:string;role:DatasetRole};

export type BuilderSnapshot={
  stimulusType:StimulusType; responseType:ResponseType; answers:Array<{id:AnswerId;label:string}>;
  correctAnswer?:string; mediaAssetId?:string; selectedMediaType?:string;
  datasetBindings?:DatasetSelection[]; allowedGisTools?:string[]; requiredGisTools?:string[]; bufferDistance?:number;
  // Legacy single-source/target/tool fields remain accepted so old QuestionVersions can still validate.
  sourceDatasetId?:string; targetDatasetId?:string; requiredGisTool?:string;
};

export function stimulusControls(type:StimulusType){
  return {media:type==="image"||type==="video",datasets:type==="webgis",mediaType:type==="image"?"IMAGE":type==="video"?"VIDEO":null};
}

export function normalizeAnswers(labels:string[]){
  return labels.map((label,index)=>({id:answerIds[index],label:label.trim()}))
    .filter((answer):answer is {id:AnswerId;label:string}=>Boolean(answer.id&&answer.label));
}

function normalizedBindings(value:BuilderSnapshot):DatasetSelection[]{
  if(value.datasetBindings)return value.datasetBindings.filter((binding)=>binding.datasetId);
  const legacy:DatasetSelection[]=[];
  if(value.sourceDatasetId)legacy.push({datasetId:value.sourceDatasetId,role:"SOURCE"});
  if(value.targetDatasetId)legacy.push({datasetId:value.targetDatasetId,role:"TARGET"});
  return legacy;
}

function normalizedTools(value:BuilderSnapshot){
  const allowed=(value.allowedGisTools??(value.requiredGisTools?.length?value.requiredGisTools:undefined)??(value.requiredGisTool?[value.requiredGisTool]:[]))
    .filter((tool)=>tool&&tool!=="none");
  const required=(value.requiredGisTools??(value.requiredGisTool?[value.requiredGisTool]:[])).filter((tool)=>tool&&tool!=="none");
  return {allowed:Array.from(new Set(allowed)),required:Array.from(new Set(required))};
}

export function validateForPublish(value:BuilderSnapshot):string[]{
  const errors:string[]=[];
  if(value.stimulusType==="image"&&(!value.mediaAssetId||value.selectedMediaType!=="IMAGE")) errors.push("Pilih MediaAsset IMAGE untuk stimulus gambar.");
  if(value.stimulusType==="video"&&(!value.mediaAssetId||value.selectedMediaType!=="VIDEO")) errors.push("Pilih MediaAsset VIDEO untuk stimulus video.");
  if((value.stimulusType==="text"||value.stimulusType==="webgis")&&value.mediaAssetId) errors.push("Konfigurasi stimulus dan MediaAsset tidak kompatibel.");
  if(value.responseType==="multiple-choice"){
    if(value.answers.length<2) errors.push("Multiple Choice memerlukan sedikitnya 2 pilihan yang terisi.");
    if(!value.correctAnswer||!value.answers.some((answer)=>answer.id===value.correctAnswer)) errors.push("Pilih jawaban benar yang masih tersedia.");
  }else if(value.stimulusType!=="webgis") errors.push("Spatial Response hanya dapat dipublish dengan stimulus WebGIS.");

  if(value.stimulusType==="webgis"){
    const bindings=normalizedBindings(value);
    const sourceCount=bindings.filter((binding)=>binding.role==="SOURCE").length;
    const targetCount=bindings.filter((binding)=>binding.role==="TARGET").length;
    const {allowed,required}=normalizedTools(value);
    if(sourceCount===0) errors.push("WebGIS memerlukan satu SOURCE Dataset.");
    if(sourceCount>1) errors.push("WebGIS saat ini hanya mendukung satu SOURCE Dataset untuk analisis authoritative.");
    if(targetCount>1) errors.push("WebGIS saat ini hanya mendukung satu TARGET Dataset untuk analisis authoritative.");
    if(required.some((tool)=>!allowed.includes(tool))) errors.push("GIS Tool wajib harus termasuk dalam tool yang diizinkan.");
    if(allowed.some((tool)=>tool==="overlay"||tool==="distance")&&targetCount===0) errors.push("Overlay/Distance memerlukan satu TARGET Dataset.");
    if(allowed.includes("buffer")&&(!value.bufferDistance||value.bufferDistance<=0)) errors.push("Buffer Distance harus lebih dari 0 meter.");
  }
  return errors;
}

export function configurationSummary(value:BuilderSnapshot){
  const stimulus=value.stimulusType.toUpperCase();
  const bindings=normalizedBindings(value);
  const {allowed,required}=normalizedTools(value);
  const layerSummary=value.stimulusType==="webgis"?` · ${bindings.length} LAYER`:"";
  const toolSummary=value.stimulusType==="webgis"&&allowed.length
    ? ` · ${allowed.map((tool)=>tool.toUpperCase()+(tool==="buffer"?` ${value.bufferDistance||0} M`:"")).join(", ")}${required.length?` · ${required.length} WAJIB`:""}`:"";
  if(value.responseType!=="multiple-choice") return `${stimulus}${layerSummary}${toolSummary} · ${value.responseType.replaceAll("-"," ").toUpperCase()}`;
  return `${stimulus}${layerSummary}${toolSummary} · MULTIPLE CHOICE · ${value.answers.length} PILIHAN`;
}
