import Link from "next/link";

const benefits = [
  ["01", "Berpikir spasial", "Siswa belajar membaca lokasi, pola, pengaruh, wilayah, dan hubungan keruangan."],
  ["02", "WebGIS dalam soal", "Peta, layer, alat analisis, dan respons muncul sesuai kebutuhan setiap pertanyaan."],
  ["03", "Siap untuk kelas", "Guru menyiapkan kelas, bank soal, data spasial, penugasan, dan hasil dari satu ruang kerja."],
];

export default function PublicHome() {
  return (
    <main className="landing-page">
      <header className="public-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>GeoLearn<small>Spatial Thinking Learning Platform</small></span>
        </Link>
        <nav className="public-links" aria-label="Navigasi publik">
          <a href="#tentang">Tentang</a>
          <Link href="/learn/demo">Demo WebGIS</Link>
          <Link className="button button-ghost" href="/teacher-login">Masuk Guru</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="status-pill">STAGING · UI V3</span>
          <p className="eyebrow">Quiz + multimodal + WebGIS</p>
          <h1>Belajar geografi dengan cara melihat, menganalisis, dan berpikir secara spasial.</h1>
          <p className="landing-lede">
            GeoLearn menghubungkan pertanyaan, media, data spasial, dan aktivitas GIS dalam satu pengalaman belajar yang terarah.
          </p>
          <div className="landing-proof" aria-label="Kemampuan GeoLearn">
            <span>8 mode Spatial Thinking</span>
            <span>WebGIS interaktif</span>
            <span>Analitik pembelajaran</span>
          </div>
        </div>

        <aside className="student-access-card" aria-labelledby="student-login-title">
          <div className="access-card-heading">
            <span className="access-icon" aria-hidden="true">◎</span>
            <div>
              <p className="eyebrow">Ruang Siswa</p>
              <h2 id="student-login-title">Masuk ke kelas</h2>
            </div>
          </div>
          <p className="access-intro">Gunakan kredensial yang diberikan guru. Siswa tidak membuat akun sendiri.</p>
          <div className="auth-fields" aria-label="Pratinjau form login siswa">
            <label>Kode Kelas<input placeholder="GL-XIA-7K3Q" readOnly /></label>
            <label>ID Siswa<input placeholder="GL-11A-001" readOnly /></label>
            <label>PIN<input type="password" placeholder="••••••" readOnly /></label>
          </div>
          <Link className="button button-wide" href="/student">Masuk ke Ruang Belajar</Link>
          <p className="preview-note">Mode UI preview — autentikasi aktif pada Slice Identity/Auth.</p>
        </aside>
      </section>

      <section className="landing-map-strip" aria-label="Ilustrasi alur belajar spasial">
        <div className="map-visual">
          <div className="map-grid-lines" />
          <span className="map-pin pin-a" />
          <span className="map-pin pin-b" />
          <span className="buffer-ring" />
          <div className="map-label-card"><strong>Pekanbaru · Akses Sekolah</strong><span>Buffer → observasi → jawaban</span></div>
        </div>
        <div className="map-strip-copy">
          <p className="eyebrow">Question-driven GIS</p>
          <h2>Satu soal menentukan stimulus, alat GIS, aktivitas, dan bentuk jawaban.</h2>
          <p>Bukan sekadar peta tempelan. Setiap interaksi spasial diarahkan oleh tujuan belajar dan dapat dicatat sebagai aktivitas bermakna.</p>
          <Link className="text-link" href="/learn/demo">Buka demo pertanyaan WebGIS →</Link>
        </div>
      </section>

      <section className="feature-section" id="tentang">
        <div className="section-heading">
          <p className="eyebrow">Dibangun untuk pembelajaran geografi</p>
          <h2>Dari konten sampai analitik, tetap dalam satu alur.</h2>
        </div>
        <div className="feature-grid">
          {benefits.map(([number, title, copy]) => (
            <article className="feature-card" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        <span>GeoLearn · staging</span>
        <span>Spatial Thinking · QuizInLearning · WebGIS</span>
      </footer>
    </main>
  );
}
