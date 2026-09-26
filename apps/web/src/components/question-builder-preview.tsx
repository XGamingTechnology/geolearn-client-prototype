"use client";

import Link from "next/link";
import { useState } from "react";

const steps = [
  "Information",
  "Stimulus",
  "Data & GIS",
  "Activity",
  "Response",
  "Validation",
  "Feedback",
  "Student Preview",
] as const;

const stimulusOptions = ["Text", "Image", "Video", "Static Map", "WebGIS", "Dual Map", "Map + Table", "Map + Chart", "Composite"];
const responseOptions = ["A–E", "Multi-select", "Map feature select", "Draw point/line/polygon", "Ranking", "Numeric", "Short text", "Composite"];

export function QuestionBuilderPreview() {
  const [step, setStep] = useState(0);

  return (
    <section className="builder-layout">
      <aside className="builder-steps" aria-label="Langkah Question Builder">
        {steps.map((label, index) => (
          <button
            className={"builder-step " + (index === step ? "active" : "")}
            key={label}
            onClick={() => setStep(index)}
            type="button"
          >
            <b>{index + 1}</b><span>{label}</span>
          </button>
        ))}
      </aside>

      <article className="builder-editor">
        <div className="builder-step-heading">
          <div>
            <p className="eyebrow">Step {step + 1} of {steps.length}</p>
            <h2>{steps[step]}</h2>
          </div>
          <span className="builder-save-state">Saved · UI preview</span>
        </div>

        {step === 0 && <InformationStep />}
        {step === 1 && <StimulusStep />}
        {step === 2 && <DataGisStep />}
        {step === 3 && <ActivityStep />}
        {step === 4 && <ResponseStep />}
        {step === 5 && <ValidationStep />}
        {step === 6 && <FeedbackStep />}
        {step === 7 && <PreviewStep />}

        <div className="builder-footer">
          {step === 0 ? <Link className="button button-secondary" href="/teacher/questions">← Bank Soal</Link> : <button className="button button-secondary" onClick={() => setStep(step - 1)} type="button">← Sebelumnya</button>}
          <span className="builder-save-state">Draft belum disimpan ke database</span>
          {step < steps.length - 1
            ? <button className="button" onClick={() => setStep(step + 1)} type="button">Berikutnya →</button>
            : <Link className="button" href="/student/assessment/demo">Buka Student Preview →</Link>}
        </div>
      </article>
    </section>
  );
}

function InformationStep() {
  return <div className="builder-form">
    <p className="builder-help">Tentukan identitas soal dan mode Spatial Thinking. Published version nantinya immutable.</p>
    <label>Judul Soal<input value="Pengaruh Sungai terhadap Akses Sekolah" readOnly /></label>
    <div className="builder-two-col">
      <label>Spatial Thinking Mode<select defaultValue="Influence" disabled><option>Influence</option></select></label>
      <label>Tingkat<select defaultValue="XI" disabled><option>XI</option></select></label>
    </div>
    <div className="builder-two-col">
      <label>Topik<input value="Aksesibilitas & wilayah pengaruh" readOnly /></label>
      <label>Difficulty<select defaultValue="Sedang" disabled><option>Sedang</option></select></label>
    </div>
    <label>Prompt<textarea value="Gunakan Buffer pada Sungai Siak untuk mengamati wilayah pengaruh dan tentukan pernyataan yang paling tepat." readOnly /></label>
  </div>;
}

function StimulusStep() {
  return <div>
    <p className="builder-help">Pilih stimulus utama. Kompleksitas GIS hanya muncul ketika stimulus memang membutuhkannya.</p>
    <div className="builder-option-grid">
      {stimulusOptions.map((item) => <button className={"builder-option-card " + (item === "WebGIS" ? "selected" : "")} key={item} type="button"><span>{item === "WebGIS" ? "◎" : item === "Video" ? "▶" : item === "Image" ? "▣" : "◇"}</span><strong>{item}</strong><small>{item === "WebGIS" ? "Interactive spatial workspace" : "Stimulus reusable"}</small></button>)}
    </div>
    <div className="builder-resource-card"><div><span className="resource-icon">◎</span><div><strong>WebGIS · Akses Sekolah Pekanbaru</strong><small>3 layers · Buffer enabled · Student tool permissions configured</small></div></div><button type="button">Change</button></div>
  </div>;
}

function DataGisStep() {
  return <div>
    <p className="builder-help">Bind dataset version dan alat GIS yang boleh digunakan siswa.</p>
    <div className="builder-resource-list">
      <Resource title="Sekolah Pekanbaru" meta="Point · School Data · v2" badge="Layer" />
      <Resource title="Sungai Siak" meta="LineString · System Data · v1" badge="Layer" />
      <Resource title="Batas Administrasi Pekanbaru" meta="Polygon · System Data · v3" badge="Layer" />
    </div>
    <h3 className="builder-subheading">Allowed GIS tools</h3>
    <div className="tool-chip-grid"><span>Pan</span><span>Zoom</span><span className="selected">Buffer</span><span className="selected">Overlay</span><span>Inspect</span><span>Distance</span></div>
  </div>;
}

function ActivityStep() {
  return <div>
    <p className="builder-help">Tentukan aktivitas GIS yang wajib diselesaikan sebelum response dapat dikirim.</p>
    <div className="activity-builder-card"><span>1</span><div><strong>Buffer</strong><p>Buat buffer 500 meter dari layer Sungai Siak.</p></div><em>Required</em></div>
    <div className="activity-builder-card"><span>2</span><div><strong>Overlay</strong><p>Bandingkan hasil buffer dengan titik sekolah.</p></div><em>Optional</em></div>
    <button className="builder-inline-action" type="button">+ Tambah aktivitas</button>
  </div>;
}

function ResponseStep() {
  return <div>
    <p className="builder-help">GeoLearn mendukung response non-teks termasuk geometri hasil digitasi.</p>
    <div className="builder-option-grid response">
      {responseOptions.map((item) => <button className={"builder-option-card " + (item === "A–E" ? "selected" : "")} key={item} type="button"><strong>{item}</strong><small>{item === "A–E" ? "Single choice" : "Available schema"}</small></button>)}
    </div>
    <div className="answer-editor">
      {["A","B","C","D","E"].map((id, index) => <div key={id}><b>{id}</b><input value={["Wilayah 0–500 m","Wilayah 500 m–1 km","Semua sekolah kota","Hanya sekolah negeri","Tidak ada pengaruh"][index]} readOnly /><span>{id === "A" ? "Correct" : ""}</span></div>)}
    </div>
  </div>;
}

function ValidationStep() {
  return <div>
    <p className="builder-help">Validation authoritative akan dijalankan di server/PostGIS untuk aturan spasial.</p>
    <div className="validation-card selected"><span>✓</span><div><strong>Static answer</strong><p>Kunci jawaban: A</p></div></div>
    <div className="validation-card"><span>◎</span><div><strong>Spatial query</strong><p>Dapat dipakai untuk overlap, distance, selected-feature rule, dan geometri.</p></div></div>
  </div>;
}

function FeedbackStep() {
  return <div className="builder-form">
    <p className="builder-help">Feedback dapat ditampilkan sesudah submit atau sesudah penugasan ditutup, sesuai policy guru.</p>
    <label>Feedback jawaban benar<textarea value="Tepat. Zona 500 meter menunjukkan area pengaruh langsung yang perlu diamati." readOnly /></label>
    <label>Feedback jawaban belum tepat<textarea value="Periksa kembali radius Buffer dan objek yang berada di dalam zona pengaruh." readOnly /></label>
  </div>;
}

function PreviewStep() {
  return <div>
    <p className="builder-help">Student Preview harus menggunakan renderer assessment yang sama dengan runtime siswa.</p>
    <div className="student-preview-card">
      <div><span className="status-pill">WEBGIS</span><h3>Pengaruh Sungai terhadap Akses Sekolah</h3><p>Buffer wajib · response A–E · Influence</p></div>
      <div className="mini-map-preview"><span /><span /><i /></div>
      <Link className="button" href="/student/assessment/demo">Open actual renderer</Link>
    </div>
  </div>;
}

function Resource({ title, meta, badge }: { title: string; meta: string; badge: string }) {
  return <div className="builder-resource-card"><div><span className="resource-icon">◫</span><div><strong>{title}</strong><small>{meta}</small></div></div><span className="resource-badge">{badge}</span></div>;
}
