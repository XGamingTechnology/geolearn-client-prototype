import { LearningWorkspace } from "@/components/learning-workspace";
import { spatialInfluenceQuestion } from "@/features/questions/example-question";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#content" aria-label="GeoLearn, ke konten utama">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>GeoLearn<small>Spatial learning workspace</small></span>
        </a>
        <span className="environment">Product foundation</span>
      </header>
      <section className="hero" id="content">
        <div>
          <p className="eyebrow">QuizInLearning × WebGIS</p>
          <h1>Belajar geografi dengan bukti spasial.</h1>
          <p className="lede">Setiap soal menentukan sendiri alat analisis dan lapisan peta yang dibutuhkan siswa.</p>
        </div>
        <dl className="principle">
          <div><dt>Mode</dt><dd>{spatialInfluenceQuestion.spatialMode}</dd></div>
          <div><dt>Alat aktif</dt><dd>{spatialInfluenceQuestion.tools.length}</dd></div>
          <div><dt>Lapisan</dt><dd>{spatialInfluenceQuestion.layers.length}</dd></div>
        </dl>
      </section>
      <LearningWorkspace question={spatialInfluenceQuestion} />
      <footer>Fondasi produk GeoLearn · Data pada layar ini hanya demonstrasi.</footer>
    </main>
  );
}
