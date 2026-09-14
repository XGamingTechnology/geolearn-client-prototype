import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";

export default async function StudentPage() {
  const session = await requireStudentSession();
  return (
    <main className="student-home">
      <header className="student-header">
        <Link className="brand" href="/"><span className="brand-mark">G</span><span>GeoLearn<small>Ruang Siswa</small></span></Link>
        <div className="student-identity"><span>{session.className}</span><strong>{session.fullName}</strong><form action="/api/auth/logout" method="post"><button className="logout-button" type="submit">Keluar</button></form></div>
      </header>

      <section className="student-hero">
        <div>
          <p className="eyebrow">Selamat datang</p>
          <h1>Siap melihat geografi dari sudut pandang spasial?</h1>
          <p>Anda masuk melalui enrollment aktif untuk kelas ini. Daftar tugas real akan dihubungkan pada Slice Assessment.</p>
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
