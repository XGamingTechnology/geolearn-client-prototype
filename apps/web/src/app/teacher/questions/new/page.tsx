import {requireTeacherSession} from "@/server/auth/session";
import {listDatasets} from "@/server/data/service";
import {listMediaBank} from "@/server/content/service";
import {QuestionBuilderForm} from "@/components/question-builder-form";

const errorMessage:Record<string,string>={
  permission:"Draft gagal dibuat karena akun ini tidak memiliki izin untuk scope yang dipilih. Coba My Bank atau gunakan akun dengan izin School Bank.",
  dataset:"Draft gagal dibuat saat mengikat dataset. Pastikan dataset masih aktif dan memiliki Published DatasetVersion.",
  save:"Draft gagal dibuat. Periksa judul, prompt, dan konfigurasi lalu coba lagi.",
};

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string;reason?:string}>}){
  const session=await requireTeacherSession();
  const [allDatasets,media,{status,reason}]=await Promise.all([listDatasets(session),listMediaBank(session),searchParams]);
  const datasets=allDatasets.filter(d=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR");
  return <main className="dashboard builder-page"><header className="catalog-header"><div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Pilih stimulus dan cara siswa menjawab. Draft dapat dilengkapi sebelum dipublish.</p></div><span className="status-pill">DATABASE</span></header>{status==="error"&&<p className="account-alert error">{errorMessage[reason??"save"]??errorMessage.save}</p>}<QuestionBuilderForm action="/api/content/questions" datasets={datasets} media={media} isNew/></main>;
}
