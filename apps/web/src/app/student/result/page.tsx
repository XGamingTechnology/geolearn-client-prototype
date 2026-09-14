import Link from "next/link";

const skills=[["Location",78],["Condition",72],["Influence",84],["Region",69],["Hierarchy",74],["Analogy",66],["Pattern",81],["Association",76]];

export default function StudentResultPage() {
  return (
    <main className="student-result-page">
      <header className="student-header">
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoLearn<small>Hasil Saya</small></span></Link>
        <span className="status-pill">PREVIEW</span>
      </header>

      <section className="result-hero">
        <div><p className="eyebrow">Selesai</p><h1>Bagus, aktivitas spasial sudah selesai.</h1><p>Berikut contoh tampilan hasil yang dapat dilihat siswa jika guru mengizinkannya.</p></div>
        <div className="score-orb"><span>Skor</span><strong>84</strong><small>/ 100</small></div>
      </section>

      <section className="student-result-grid">
        <article className="result-summary-card"><span>Akurasi</span><strong>84%</strong><small>UI preview</small></article>
        <article className="result-summary-card"><span>Waktu</span><strong>08:42</strong><small>median demo</small></article>
        <article className="result-summary-card"><span>Aktivitas GIS</span><strong>2/2</strong><small>required complete</small></article>
      </section>

      <section className="student-skill-panel">
        <div className="panel-heading"><div><p className="eyebrow">Spatial Thinking Profile</p><h2>Profil kemampuan spasial</h2></div><span className="status-pill">PREVIEW</span></div>
        <div className="student-skill-list">
          {skills.map(([name,value]) => (
            <div className="student-skill-row" key={String(name)}>
              <span>{name}</span><div><i style={{width:value+"%"}} /></div><strong>{value}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="feedback-card">
        <div><p className="eyebrow">Feedback</p><h2>Influence sudah kuat.</h2><p>Anda mampu menggunakan zona pengaruh untuk menghubungkan lokasi sungai dan akses sekolah. Pada latihan berikutnya, perhatikan juga pola dan association antar-layer.</p></div>
        <Link className="button" href="/student">Kembali ke Beranda</Link>
      </section>

      <p className="preview-banner result-preview-banner">Semua angka pada halaman ini adalah contoh UI, bukan hasil siswa nyata.</p>
    </main>
  );
}
