export const answerIds=["A","B","C","D","E"] as const;
export type AnswerId=(typeof answerIds)[number];
export type StimulusType="text"|"image"|"video"|"webgis";
export type ResponseType="multiple-choice"|"draw-point"|"draw-line"|"draw-polygon"|"feature-select";

export type BuilderSnapshot={
  stimulusType:StimulusType; responseType:ResponseType; answers:Array<{id:AnswerId;label:string}>;
  correctAnswer?:string; mediaAssetId?:string; selectedMediaType?:string;
  sourceDatasetId?:string; targetDatasetId?:string; requiredGisTool?:string; bufferDistance?:number;
};

export function stimulusControls(type:StimulusType){
  return {media:type==="image"||type==="video",datasets:type==="webgis",mediaType:type==="image"?"IMAGE":type==="video"?"VIDEO":null};
}

export function normalizeAnswers(labels:string[]){
  return labels.map((label,index)=>({id:answerIds[index],label:label.trim()}))
    .filter((answer):answer is {id:AnswerId;label:string}=>Boolean(answer.id&&answer.label));
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
    if(!value.sourceDatasetId) errors.push("WebGIS memerlukan SOURCE Dataset.");
    if(value.requiredGisTool&&value.requiredGisTool!=="none"&&!value.targetDatasetId) errors.push("GIS Tool yang dipilih memerlukan TARGET Dataset.");
    if(value.requiredGisTool==="buffer"&&(!value.bufferDistance||value.bufferDistance<=0)) errors.push("Buffer Distance harus lebih dari 0 meter.");
  }
  return errors;
}

export function configurationSummary(value:BuilderSnapshot){
  const stimulus=value.stimulusType.toUpperCase();
  if(value.responseType!=="multiple-choice") return `${stimulus} · ${value.responseType.replaceAll("-"," ").toUpperCase()}`;
  const tool=value.stimulusType==="webgis"&&value.requiredGisTool&&value.requiredGisTool!=="none"
    ? ` · ${value.requiredGisTool.toUpperCase()}${value.requiredGisTool==="buffer"?` ${value.bufferDistance||0} M`:""}`:"";
  return `${stimulus}${tool} · MULTIPLE CHOICE · ${value.answers.length} PILIHAN`;
}
