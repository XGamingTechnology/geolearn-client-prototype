import Link from "next/link";
import { notFound } from "next/navigation";

const cases = {
  "banjir-rob-semarang-demak": { title:"Banjir Rob Semarang–Demak", mode:"Association", scope:"School", status:"Published", description:"Case komposit untuk menghubungkan genangan pesisir, penggunaan lahan, dan dampak pada permukiman." },
  "akses-sekolah-pekanbaru": { title:"Akses Sekolah Pekanbaru", mode:"Influence", scope:"School", status:"Draft", description:"Case WebGIS untuk mengamati wilayah pengaruh sungai dan akses fasilitas pendidikan." },
  "lereng-cisarua": { title:"Kerawanan Lereng Cisarua", mode:"Condition", scope:"My", status:"Draft", description:"Case map + chart untuk membaca kondisi lereng, curah hujan, dan penggunaan lahan." },
  "merapi-zona-bahaya": { title:"Zona Bahaya Gunung Merapi", mode:"Region", scope:"System", status:"Published", description:"Case WebGIS untuk memahami zonasi bahaya dan perbedaan karakter antarwilayah." },
} as const;

export default async function CaseDetailPage({params}:{params:Promise<{caseId:string}>}){
  const {caseId}=await params;
  const item=cases[caseId as keyof typeof cases];
  if(!item) notFound();

  return (
    <main className="dashboard case-detail-page">
      <div className="breadcrumb"><Link href="/teacher/cases">Case Library</Link><span>/</span><strong>{item.title}</strong></div>

      <header className="case-detail-header">
        <div>
          <div className="dataset-badges"><span>{item.scope}</span><span>{item.status}</span><span>Case v1</span></div>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
        <div className="dashboard-actions"><button className="button button-secondary" type="button" disabled>Duplicate & Edit</button><Link className="button" href="/student/assessment/demo">Student Preview</Link></div>
      </header>

      <section className="case-detail-layout">
        <div className="case-main-column">
          <article className="dashboard-panel">
            <div className="panel-heading"><div><p className="eyebrow">Map State</p><h2>Spatial workspace</h2></div><Link href="/teacher/gis">Open GIS Studio →</Link></div>
            <div className="case-map-large"><div className="case-map-grid"/><span className="case-water-line"/><span className="case-area-shape"/><span className="case-point one"/><span className="case-point two"/><div className="case-map-caption">UI preview · geometry simulasi</div></div>
          </article>

          <article className="dashboard-panel case-section">
            <div className="panel-heading"><div><p className="eyebrow">Related Questions</p><h2>Pertanyaan dalam Case</h2></div><Link href="/teacher/questions/new">+ Add Question</Link></div>
            <div className="case-question-list">
              <div><span>Q1</span><div><strong>Kondisi wilayah terdampak</strong><small>Condition · Static Map · A–E</small></div><em>Published</em></div>
              <div><span>Q2</span><div><strong>Pola genangan pesisir</strong><small>Pattern · WebGIS · A–E</small></div><em>Published</em></div>
              <div><span>Q3</span><div><strong>Hubungan penggunaan lahan dan rob</strong><small>Association · Composite · Multi-select</small></div><em>Draft</em></div>
              <div><span>Q4</span><div><strong>Wilayah pengaruh genangan</strong><small>Influence · WebGIS · A–E</small></div><em>Draft</em></div>
            </div>
          </article>
        </div>

        <aside className="case-side-column">
          <article className="dashboard-panel">
            <p className="eyebrow">Data Binding</p><h2>Dataset</h2>
            <div className="case-resource-list">
              <Link href="/teacher/data/sungai-siak"><span>◫</span><div><strong>Batas Pesisir</strong><small>Polygon · v1</small></div></Link>
              <Link href="/teacher/data/sekolah-pekanbaru"><span>◫</span><div><strong>Genangan Rob</strong><small>Polygon · v2</small></div></Link>
              <Link href="/teacher/data/batas-administrasi-pekanbaru"><span>◫</span><div><strong>Penggunaan Lahan</strong><small>Polygon · v3</small></div></Link>
            </div>
          </article>

          <article className="dashboard-panel case-section">
            <p className="eyebrow">Stimulus Assets</p><h2>Media</h2>
            <div className="case-resource-list">
              <Link href="/teacher/media/video-banjir-rob"><span>▶</span><div><strong>Video Banjir Rob Pesisir</strong><small>Video · 02:14</small></div></Link>
              <Link href="/teacher/media/citra-tutupan-lahan"><span>▣</span><div><strong>Citra Tutupan Lahan</strong><small>Image · 2400×1600</small></div></Link>
            </div>
          </article>
        </aside>
      </section>

      <p className="preview-banner">Case detail ini adalah UI preview. Resource links menggunakan contoh katalog, bukan binding authoritative.</p>
    </main>
  );
}
