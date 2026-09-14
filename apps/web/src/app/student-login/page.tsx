import Link from "next/link";

const errors: Record<string, string> = {
  invalid: "Kode kelas, ID siswa, atau PIN tidak valid.",
  locked: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
};

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>GeoLearn<small>Ruang Siswa</small></span>
      </Link>

      <section className="auth-card">
        <span className="status-pill">STAGING</span>
        <p className="eyebrow">Akses Siswa</p>
        <h1>Masuk ke kelas Anda</h1>
        <p>Gunakan Kode Kelas, ID Siswa, dan PIN yang diberikan sekolah. Tidak ada pendaftaran mandiri.</p>
        {error && <p className="auth-error" role="alert">{errors[error] ?? errors.invalid}</p>}
        <form action="/api/auth/student/login" method="post">
          <div className="auth-fields">
            <label>Kode Kelas<input name="classCode" placeholder="GL-XIA-7K3Q" autoCapitalize="characters" autoComplete="off" required /></label>
            <label>ID Siswa<input name="loginId" placeholder="GL-11A-001" autoComplete="username" required /></label>
            <label>PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" placeholder="••••••" autoComplete="current-password" required /></label>
          </div>
          <button className="button button-wide" type="submit">Masuk ke Ruang Belajar</button>
        </form>
        <div className="auth-meta"><span>Kesulitan masuk?</span><span>Hubungi guru untuk reset PIN.</span></div>
      </section>
    </main>
  );
}
