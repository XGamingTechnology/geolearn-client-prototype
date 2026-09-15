import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listDatasets } from "@/server/data/service";
import { listMediaBank } from "@/server/content/service";

const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
const stimuli=["text","image","video","static-map","webgis","dual-map","map-table","map-chart","composite"];

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const [datasets,media,{status}]=await Promise.all([listDatasets(session),listMediaBank(session),searchParams]);
  return (
    <main className="dashboard builder-page">
      <header className="catalog-header"><div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Draft tersimpan ke PostgreSQL dan dapat dipublish menjadi version immutable.</p></div><span className="status-pill">DATABASE</span></header>
      {status==="error"&&<p className="account-alert error">Draft gagal dibuat. Periksa field dan hak scope.</p>}
      <form action="/api/content/questions" method="post" className="real-question-form">
        <section className="dashboard-panel">
          <p className="eyebrow">1 · Information</p><div className="builder-two-col">
            <label>Judul<input name="title" required maxLength={220}/></label>
            <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Bank</option><option value="SCHOOL">School Bank</option></select></label>
          </div>
          <div className="builder-two-col"><label>Subject<input name="subject" defaultValue="Geografi"/></label><label>Topik<input name="topic"/></label></div>
          <div className="builder-two-col"><label>Spatial Thinking<select name="spatialMode" defaultValue="influence">{modes.map((m)=><option key={m}>{m}</option>)}</select></label><label>Difficulty<input name="difficulty" defaultValue="Sedang"/></label></div>
        </section>
        <section className="dashboard-panel"><p className="eyebrow">2 · Stimulus & GIS Activity</p><label>Stimulus Type<select name="stimulusType" defaultValue="text">{stimuli.map((x)=><option value={x} key={x}>{x}</option>)}</select></label><div className="builder-two-col"><label>Required GIS Tool<select name="requiredGisTool" defaultValue=""><option value="">Tidak wajib</option><option value="buffer">Buffer</option><option value="overlay">Overlay</option><option value="distance">Distance</option></select></label><label>Buffer Distance (m)<input name="bufferDistance" type="number" min={1} max={100000} defaultValue={500}/></label></div><div className="builder-two-col"><label>Source Dataset<select name="sourceDatasetId" defaultValue=""><option value="">Tidak ada</option>{datasets.filter((d)=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR").map((d)=><option value={d.id} key={d.id}>{d.title} · {d.geometryType??"Geometry"}</option>)}</select></label><label>Target Dataset<select name="targetDatasetId" defaultValue=""><option value="">Tidak ada</option>{datasets.filter((d)=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR").map((d)=><option value={d.id} key={d.id}>{d.title} · {d.geometryType??"Geometry"}</option>)}</select></label></div><div className="builder-two-col"><label>Stimulus Media<select name="stimulusMediaId" defaultValue=""><option value="">Tidak ada</option>{media.filter((m)=>m.mediaType==="IMAGE"||m.mediaType==="VIDEO").map((m)=><option value={m.id} key={m.id}>{m.title} · {m.mediaType}</option>)}</select></label><label>Media Alt Text<input name="mediaAltText" placeholder="Deskripsi singkat untuk aksesibilitas"/></label></div><label>Media Caption<input name="mediaCaption" placeholder="Caption opsional"/></label><small className="form-note">WebGIS memakai immutable DatasetVersion dari Bank Data. Image/video memakai MediaAsset yang dibind ke QuestionVersion.</small></section>
        <section className="dashboard-panel"><p className="eyebrow">3 · Prompt & Response</p><label>Prompt<textarea name="prompt" required rows={5}/></label><label>Response Type<select name="responseType" defaultValue="multiple-choice"><option value="multiple-choice">A–E</option><option value="draw-point">Draw Point</option><option value="draw-line">Draw Line</option><option value="draw-polygon">Draw Polygon</option><option value="feature-select">Select Map Feature</option></select></label><div className="answer-form-grid">{["A","B","C","D","E"].map((id)=><label key={id}>{id}<input name={"answer_"+id}/></label>)}</div><label>Kunci A–E<select name="correctAnswer" defaultValue="A">{["A","B","C","D","E"].map((id)=><option key={id}>{id}</option>)}</select></label><div className="builder-two-col"><label>Spatial Validation<select name="spatialValidationMethod" defaultValue="manual-review"><option value="manual-review">Manual Review</option><option value="geometry-distance">Geometry Distance</option><option value="geometry-overlap">Geometry Overlap</option></select></label><label>Max Distance (m)<input name="maxDistanceMeters" type="number" min={0} defaultValue={100}/></label></div><label>Min Overlap Ratio (0–1)<input name="minOverlapRatio" type="number" min={0} max={1} step={0.05} defaultValue={0.5}/></label><small className="form-note">A–E wajib hanya untuk response multiple-choice. Geometry Distance/Overlap memakai TARGET DatasetVersion sebagai referensi authoritative PostGIS.</small></section>
        <section className="dashboard-panel"><p className="eyebrow">4 · Feedback</p><label>Benar<textarea name="feedbackCorrect" rows={3}/></label><label>Belum tepat<textarea name="feedbackIncorrect" rows={3}/></label></section>
        <div className="builder-footer"><Link className="button button-secondary" href="/teacher/questions">← Bank Soal</Link><button className="button" type="submit">Simpan Draft</button></div>
      </form>
    </main>
  );
}
