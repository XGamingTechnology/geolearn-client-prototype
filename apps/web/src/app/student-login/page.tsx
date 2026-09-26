import AuthLoginForm from "@/components/auth-login-form";

const errors: Record<string, string> = {
  invalid: "Kode Kelas, ID Siswa, atau PIN tidak valid. Periksa kembali data Anda.",
  locked: "Terlalu banyak percobaan masuk. Tunggu beberapa menit, lalu coba lagi.",
};

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthLoginForm role="student" errorMessage={error ? errors[error] ?? errors.invalid : undefined} />;
}
