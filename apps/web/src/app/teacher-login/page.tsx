import Link from "next/link";

const errors: Record<string,string> = {
  invalid: "Email atau password tidak valid.",
  locked: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
};

export default async function TeacherLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>GeoLearn<small>Ruang Guru</small></span>
      </Link>
      <section className="auth-card">
        <span className="status-pill">STAGING</span>
        <p className="eyebrow">Akses Guru</p>
        <h1>Masuk ke ruang kerja GeoLearn</h1>
        <p>Gunakan akun guru yang dikelola sekolah. Sesi akan disimpan sebagai cookie HttpOnly.</p>
        {error && <p className="auth-error" role="alert">{errors[error] ?? errors.invalid}</p>}
        <form action="/api/auth/teacher/login" method="post">
          <div className="auth-fields">
            <label>Email<input name="email" type="email" placeholder="guru@sekolah.sch.id" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" placeholder="••••••••••••" autoComplete="current-password" required /></label>
          </div>
          <button className="button button-wide" type="submit">Masuk sebagai Guru</button>
        </form>
        <div className="auth-meta"><span>Lupa password?</span><span>Hubungi admin sekolah untuk reset credential.</span></div>
      </section>
    </main>
  );
}
