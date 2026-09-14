import Link from "next/link";

export default function StudentPage() {
  return (
    <main className="student-home">
      <header className="student-header">
        <Link className="brand" href="/"><span className="brand-mark">G</span><span>GeoLearn<small>Ruang Siswa</small></span></Link>
        <div className="student-identity"><span>XI-A</span><strong>Mode Preview</strong></div>
      </header>

      <section className="student-hero">
        <div>
          <p className="eyebrow">Selamat datang</p>
          <h1>Siap melihat geografi dari sudut pandang spasial?</h1>
          <p>Ini adalah pratinjau ruang siswa. Setelah autentikasi aktif, tugas dari kelas Anda akan tampil otomatis di sini.</p>
        </div>
        <div className="student-progress">
          <span>Progress minggu ini</span><strong>—</strong><small>Belum ada data attempt</small>
        </div>
      </section>

      <section className="student-section">
        <div className="section-heading-row">
          <div><p className="eyebrow">Tugas</p><h2>Tugas yang tersedia</h2></div>
          <span className="status-pill">PREVIEW</span>
        </div>
        <article className="assignment-card">
          <div className="assignment-icon">◫</div>
          <div className="assignment-copy">
            <span className="assignment-kicker">Spatial Influence · WebGIS</span>
            <h3>Pengaruh sungai terhadap akses sekolah</h3>
            <p>Gunakan Buffer pada peta, amati wilayah pengaruh, lalu jawab pertanyaan A–E.</p>
          </div>
          <Link className="button" href="/student/assessment/demo">Mulai Tugas</Link>
        </article>
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link className="active" href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
