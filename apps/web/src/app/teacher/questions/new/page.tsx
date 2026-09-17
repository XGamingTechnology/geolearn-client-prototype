import {requireTeacherSession} from "@/server/auth/session";
import {listDatasets} from "@/server/data/service";
import {listMediaBank} from "@/server/content/service";
import {QuestionBuilderForm} from "@/components/question-builder-form";

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const [allDatasets,media,{status}]=await Promise.all([listDatasets(session),listMediaBank(session),searchParams]);
  const datasets=allDatasets.filter(d=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR");
  return <main className="dashboard builder-page"><header className="catalog-header"><div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Pilih stimulus dan cara siswa menjawab. Draft dapat dilengkapi sebelum dipublish.</p></div><span className="status-pill">DATABASE</span></header>{status==="error"&&<p className="account-alert error">Draft gagal dibuat. Periksa informasi wajib.</p>}<QuestionBuilderForm action="/api/content/questions" datasets={datasets} media={media} isNew/></main>;
}
