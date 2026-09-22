import Link from "next/link";
import {requireTeacherSession} from "@/server/auth/session";
import {listQuestionDatasetOptions} from "@/server/content/question-datasets";
import {listMediaBank} from "@/server/content/service";
import {listQuestionGroups} from "@/server/content/question-groups";
import {QuestionBuilderForm} from "@/components/question-builder-form";

const errorMessage:Record<string,string>={
  permission:"Draft gagal dibuat karena akun ini tidak memiliki izin untuk scope yang dipilih. Coba My Bank atau gunakan akun dengan izin School Bank.",
  dataset:"Draft gagal dibuat saat mengikat dataset. Pastikan dataset masih aktif dan memiliki Published DatasetVersion.",
  group:"Draft gagal dibuat karena Stimulus Set tidak valid, tidak sesuai scope, atau tipe stimulus berbeda.",
  save:"Draft gagal dibuat. Periksa judul, prompt, dan konfigurasi lalu coba lagi.",
};

export default async function NewQuestionPage({searchParams}:{searchParams:Promise<{status?:string;reason?:string;groupId?:string}>}){
  const session=await requireTeacherSession();
  const [datasets,media,groups,params]=await Promise.all([listQuestionDatasetOptions(session),listMediaBank(session),listQuestionGroups(session),searchParams]);
  const {status,reason,groupId}=params;
  const group=groupId?groups.find((item)=>item.id===groupId):undefined;
  const action=group?`/api/content/questions?groupId=${encodeURIComponent(group.id)}`:"/api/content/questions";
  const initial=group?{scope:group.scope,subject:group.subject??"Geografi",topic:group.topic??"",stimulusType:group.stimulusType}:{};

  return <main className="dashboard builder-page">
    <header className="catalog-header"><div><p className="eyebrow">Question Builder</p><h1>{group?"Tambah Soal ke Stimulus Set":"Buat Soal Baru"}</h1><p>{group?`Stimulus Set: ${group.title}. Soal ini tetap memiliki QuestionVersion immutable sendiri.`:"Pilih stimulus dan cara siswa menjawab. Draft dapat dilengkapi sebelum dipublish."}</p></div><div className="row-actions">{group&&<Link className="button button-secondary" href="/teacher/questions/groups">Stimulus Set</Link>}<span className="status-pill">DATABASE</span></div></header>
    {groupId&&!group&&<p className="account-alert error">Stimulus Set tidak ditemukan atau tidak dapat diakses.</p>}
    {status==="error"&&<p className="account-alert error">{errorMessage[reason??"save"]??errorMessage.save}</p>}
    {group&&<section className="dashboard-panel"><p className="eyebrow">Stimulus Set Aktif</p><h2>{group.title}</h2><p>{group.description||"Tanpa deskripsi."}</p><div className="question-tags"><span>{group.stimulusType}</span><span>{group.scope}</span>{group.topic&&<span>{group.topic}</span>}</div><p className="form-note">Scope dan tipe stimulus soal harus mengikuti Stimulus Set agar kelompok tetap konsisten.</p></section>}
    {!groupId||group?<QuestionBuilderForm action={action} datasets={datasets} media={media} initial={initial} isNew/>:null}
  </main>;
}
