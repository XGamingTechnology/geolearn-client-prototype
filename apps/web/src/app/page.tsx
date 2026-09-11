import Link from "next/link";

export default function PublicHome() {
  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Navigasi utama">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">G</span><span>GeoLearn<small>QuizInLearning + WebGIS</small></span></Link>
        <div><Link href="/student">Area siswa</Link><Link className="button secondary" href="/teacher">Area guru</Link></div>
      </nav>
      <section className="public-hero">
        <div>
          <p className="eyebrow">Belajar geografi secara spasial</p>
          <h1>Dari pertanyaan, menuju pemahaman ruang.</h1>
          <p className="lede">GeoLearn menghubungkan kuis dengan alat WebGIS yang tepat agar siswa SMA dapat mengamati, menganalisis, dan menjelaskan fenomena geografi.</p>
          <div className="hero-actions"><Link className="button" href="/student">Mulai sebagai siswa</Link><Link className="text-link" href="/learn/demo">Lihat demonstrasi →</Link></div>
        </div>
        <aside className="map-preview" aria-label="Ilustrasi pembelajaran berbasis peta"><span className="map-dot one"/><span className="map-dot two"/><span className="map-ring"/><div><b>Soal menentukan pengalaman GIS</b><small>Lapisan, alat, dan jawaban tampil sesuai konfigurasi.</small></div></aside>
      </section>
      <section className="value-grid" aria-label="Keunggulan GeoLearn"><article><b>01</b><h2>Berbasis pertanyaan</h2><p>Setiap aktivitas spasial memiliki tujuan belajar yang jelas.</p></article><article><b>02</b><h2>Analisis WebGIS</h2><p>Alat dan lapisan adaptif, bukan peta terpisah untuk tiap soal.</p></article><article><b>03</b><h2>Untuk kelas Indonesia</h2><p>Antarmuka jelas dan responsif untuk konteks belajar SMA.</p></article></section>
    </main>
  );
}
