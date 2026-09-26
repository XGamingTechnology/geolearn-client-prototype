import AuthLoginForm from "@/components/auth-login-form";

const errors: Record<string, string> = {
  invalid: "Email atau password tidak valid. Periksa kembali data Anda.",
  locked: "Terlalu banyak percobaan masuk. Tunggu beberapa menit, lalu coba lagi.",
};

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthLoginForm role="teacher" errorMessage={error ? errors[error] ?? errors.invalid : undefined} />;
}
