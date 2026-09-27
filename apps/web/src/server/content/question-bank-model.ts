import type { SpatialThinkingMode } from "@/features/questions/types";
import { mediaDeliveryUrl } from "@/server/media/storage-core";

export type QuestionBankMediaPreview={mediaAssetId:string;title:string;mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";deliveryUrl:string|null;altText:string|null;caption:string|null};
export type QuestionBankDatasetPreview={datasetVersionId:string;title:string;role:"SOURCE"|"TARGET"|"CONTEXT";dataKind:"VECTOR"|"RASTER"|"TABLE";bbox:[number,number,number,number]|null};

export type QuestionBankRow={
  id:string;
  title:string;
  subject:string|null;
  topic:string|null;
  scope:"SYSTEM"|"SCHOOL"|"PRIVATE";
  questionStatus:"ACTIVE"|"ARCHIVED";
  ownerTeacherId:string|null;
  versionId:string|null;
  versionNumber:number|null;
  spatialMode:SpatialThinkingMode|null;
  difficulty:string|null;
  prompt:string|null;
  versionStatus:"DRAFT"|"PUBLISHED"|null;
  stimulusType:string|null;
  responseType:string|null;
  hasPublished:boolean;
  groupId:string|null;
  groupTitle:string|null;
  groupStimulusType:string|null;
  basemap:string;
  mapExperience:string;
  mapInteractions:string[];
  configuredGisTools:string[];
  requiredGisTools:string[];
  datasetCount:number;
  vectorCount:number;
  rasterCount:number;
  datasets:QuestionBankDatasetPreview[];
  media:QuestionBankMediaPreview|null;
};

export type QuestionBankDatabaseRow=Omit<QuestionBankRow,"media">&{media:(Omit<QuestionBankMediaPreview,"deliveryUrl">&{storageKey:string|null})|null};

export function hydrateQuestionBankRow(row:QuestionBankDatabaseRow):QuestionBankRow{
  return {...row,media:row.media?{
    mediaAssetId:row.media.mediaAssetId,
    title:row.media.title,
    mediaType:row.media.mediaType,
    deliveryUrl:mediaDeliveryUrl(row.media.mediaAssetId,row.media.storageKey),
    altText:row.media.altText,
    caption:row.media.caption,
  }:null};
}
