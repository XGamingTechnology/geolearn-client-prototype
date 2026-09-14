import Link from "next/link";

const media = [
  { id:"video-banjir-rob", title: "Video Banjir Rob Pesisir", type: "Video", meta: "02:14 · 1080p", icon: "▶" },
  { id:"citra-tutupan-lahan", title: "Citra Perubahan Tutupan Lahan", type: "Image", meta: "2400 × 1600", icon: "▣" },
  { id:"infografik-siklus-hidrologi", title: "Infografik Siklus Hidrologi", type: "Illustration", meta: "SVG · 1.8 MB", icon: "◇" },
  { id:"tabel-curah-hujan", title: "Tabel Curah Hujan Bulanan", type: "Document", meta: "PDF · 6 halaman", icon: "▤" },
];

export default function MediaPage() {
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Media Bank</p><h1>Media</h1><p>Image, video, document, chart, dan illustration sebagai stimulus reusable yang terpisah dari dataset spasial.</p></div>
        <button className="button" type="button" disabled>Upload Media</button>
      </header>
      <div className="scope-tabs"><span className="active">Semua Media</span><span>Image</span><span>Video</span><span>Document</span><span>Illustration</span></div>
      <div className="catalog-toolbar"><div className="search-box">⌕ <input aria-label="Cari media" placeholder="Cari media..." readOnly /></div><div className="filter-chips"><span>Scope</span><span>Tag</span><span>Terbaru</span></div></div>
      <section className="media-grid">
        {media.map((m) => (
          <article className="media-card" key={m.title}>
            <div className="media-preview"><span>{m.icon}</span><small>{m.type}</small></div>
            <div className="media-body"><div className="dataset-badges"><span>{m.type}</span><span>School</span></div><h2>{m.title}</h2><p>{m.meta}</p><div className="dataset-actions"><Link href={`/teacher/media/${m.id}`}>Preview</Link><Link href="/teacher/cases">Use in Case</Link><Link href="/teacher/questions/new">Use in Question</Link></div></div>
          </article>
        ))}
      </section>
      <p className="preview-banner">Media Bank masih UI preview. Upload pipeline dan storage akan ditambahkan pada Slice Content Authoring.</p>
    </main>
  );
}
