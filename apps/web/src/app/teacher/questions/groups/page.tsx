import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listQuestionGroupCards } from "@/server/content/question-groups";

export default async function QuestionGroupsPage(){
  const session=await requireTeacherSession();
  const groups=await listQuestionGroupCards(session);
  return <main className="dashboard catalog-page">
    <header className="catalog-header"><div><p className="eyebrow">Question Library</p><h1>Stimulus Set</h1><p>Kelompokkan beberapa soal yang menggunakan konteks atau stimulus yang sama.</p></div><div className="row-actions"><Link className="button button-secondary" href="/teacher/questions">Bank Soal</Link><Link className="button" href="/teacher/questions/groups/new">+ Stimulus Set</Link></div></header>
    <section className="question-bank-list">
      {groups.map((group)=><article className="question-bank-row" key={group.id}>
        <div className="question-thumb">{group.stimulusType==="webgis"?"◎":group.stimulusType==="video"?"▶":group.stimulusType==="image"?"▣":"T"}</div>
        <div className="question-main"><div className="question-tags"><span>{group.stimulusType}</span><span>{group.scope}</span>{group.topic&&<span>{group.topic}</span>}</div><h2>{group.title}</h2><p>{group.description||"Tanpa deskripsi."}</p><small>{group.questionCount} soal · {group.publishedCount} published · {group.draftCount} draft</small></div>
        <div className="row-actions"><Link href={`/teacher/questions/new?groupId=${group.id}`}>+ Tambah Soal</Link></div>
      </article>)}
    </section>
    {!groups.length&&<div className="empty-state"><strong>Belum ada Stimulus Set.</strong><p>Buat satu set untuk mengelompokkan beberapa soal dengan stimulus yang sama.</p><Link className="button" href="/teacher/questions/groups/new">Buat Stimulus Set</Link></div>}
  </main>;
}
