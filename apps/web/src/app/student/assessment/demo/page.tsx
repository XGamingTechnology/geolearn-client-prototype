import Link from "next/link";
import { LearningWorkspace } from "@/components/learning-workspace";
import { spatialInfluenceQuestion } from "@/features/questions/example-question";

export default function StudentAssessmentDemo() {
  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-brand"><span className="brand-mark">G</span><div><strong>GeoLearn Assessment</strong><small>XI-A · Demo Spatial Influence</small></div></div>
        <div className="assessment-progress"><span>Soal 1 dari 1</span><div><i /></div></div>
        <Link className="assessment-exit" href="/student">Keluar</Link>
      </header>

      <section className="assessment-intro">
        <div><p className="eyebrow">WebGIS Question</p><h1>Gunakan bukti spasial sebelum menjawab.</h1><p>Ikuti aktivitas GIS wajib pada peta, lalu pilih jawaban yang paling tepat.</p></div>
        <span className="status-pill">DATA SIMULASI</span>
      </section>

      <LearningWorkspace question={spatialInfluenceQuestion} />

      <section className="assessment-footer-card">
        <div><strong>Student Preview</strong><p>Attempt belum disimpan ke database. Aktivitas GIS hanya hidup di sesi browser demo ini.</p></div>
        <Link className="button button-secondary" href="/student/result">Lihat contoh hasil</Link>
      </section>
    </main>
  );
}
