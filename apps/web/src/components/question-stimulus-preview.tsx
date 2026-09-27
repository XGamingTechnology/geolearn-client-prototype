/* eslint-disable @next/next/no-img-element -- authenticated media delivery URLs are not static image assets. */
import type {QuestionBankRow} from "@/server/content/question-bank-model";
import styles from "@/app/teacher/questions/question-bank.module.css";

function label(type:string|null){return type==="webgis"?"WebGIS":type==="image"?"Gambar":type==="video"?"Video":"Teks";}
function titleCase(value:string){return value ? value[0].toUpperCase()+value.slice(1) : value;}

export function QuestionStimulusPreview({question}:{question:QuestionBankRow}){
  const type=question.stimulusType??"text";
  if(type==="image")return <div className={`${styles.visual} ${styles.visual_image}`}>{question.media?.deliveryUrl?<img className={styles.mediaImage} src={question.media.deliveryUrl} alt={question.media.altText?.trim()||question.media.title}/>:<div className={styles.mediaFallback}><b>Gambar</b><span>Stimulus belum tersedia</span></div>}<span className={styles.stimulusLabel}>Gambar{question.media?.title?` · ${question.media.title}`:""}</span></div>;
  if(type==="video")return <div className={`${styles.visual} ${styles.visual_video}`}><div className={styles.videoPreview} aria-label={`Video: ${question.media?.title??"stimulus belum tersedia"}`}><span aria-hidden="true">▶</span><b>{question.media?.title??"Video belum tersedia"}</b><small>Putar di Preview</small></div><span className={styles.stimulusLabel}>Video</span></div>;
  if(type==="webgis")return <div className={`${styles.visual} ${styles.visual_webgis}`}><div className={styles.webgisPreview}><div className={styles.webgisHeadline}><b>WEBGIS</b><span>{titleCase(question.basemap)} · {question.datasetCount} layer</span></div><div className={styles.layerSummary}>{question.datasets.length?question.datasets.slice(0,2).map(layer=><span key={layer.datasetVersionId}><b>{layer.role}</b> · {layer.title}</span>):<span>Belum ada dataset terhubung</span>}</div><div className={styles.toolSummary}>{question.configuredGisTools.slice(0,3).map(tool=><span key={tool}>{tool.toUpperCase()}{question.requiredGisTools.includes(tool)?" · WAJIB":""}</span>)}</div></div><span className={styles.stimulusLabel}>{label(type)} · skematis</span></div>;
  return <div className={styles.visual}><div className={styles.textPreview}><span aria-hidden="true">?</span><b>Pertanyaan teks</b><small>Stimulus langsung pada prompt soal</small></div><span className={styles.stimulusLabel}>Teks</span></div>;
}
