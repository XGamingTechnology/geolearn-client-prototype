import { notFound } from "next/navigation";

const sections = { classes: ["Kelas", "Pengelolaan kelas akan dikembangkan setelah fondasi autentikasi tersedia."], questions: ["Bank Soal", "Backend dan authoring soal belum termasuk dalam slice fondasi ini."], assignments: ["Penugasan", "Penyimpanan penugasan dan attempt akan hadir pada slice lanjutan."] } as const;

export default async function TeacherSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const [title, description] = sections[section as keyof typeof sections];
  return <main className="dashboard"><header className="page-heading"><div><p className="eyebrow">Rute awal ruang guru</p><h1>{title}</h1><p>{description}</p></div></header><section className="panel empty"><span>◇</span><h3>Belum tersedia pada Slice 1</h3><p>Halaman ini sengaja menjadi batas navigasi tanpa operasi data.</p></section></main>;
}
