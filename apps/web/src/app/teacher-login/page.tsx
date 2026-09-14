import Link from "next/link";

export default function TeacherLoginPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>GeoLearn<small>Ruang Guru</small></span>
      </Link>

      <section className="auth-card">
        <span className="status-pill">STAGING PREVIEW</span>
        <p className="eyebrow">Akses Guru</p>
        <h1>Masuk ke ruang kerja GeoLearn</h1>
        <p>Kelola kelas, soal, data spasial, GIS Studio, penugasan, dan hasil belajar.</p>
        <div className="auth-fields">
          <label>Email<input type="email" placeholder="guru@sekolah.sch.id" readOnly /></label>
          <label>Password<input type="password" placeholder="••••••••" readOnly /></label>
        </div>
        <Link className="button button-wide" href="/teacher">Masuk sebagai Guru</Link>
        <div className="auth-meta">
          <span>Belum bisa login?</span>
          <span>Autentikasi real akan aktif pada Slice #10.</span>
        </div>
      </section>
    </main>
  );
}
