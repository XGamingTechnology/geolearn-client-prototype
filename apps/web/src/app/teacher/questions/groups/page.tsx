import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listQuestionGroupCards } from "@/server/content/question-groups";

const modeLabels:Record<string,string>={location:"Spatial Location",condition:"Spatial Condition",influence:"Spatial Influence",region:"Spatial Region",hierarchy:"Spatial Hierarchy",analogy:"Spatial Analogies",pattern:"Spatial Pattern",association:"Spatial Association"};

export default async function QuestionGroupsPage(){
  const session=await requireTeacherSession();
  const groups=await listQuestionGroupCards(session);
  return <main className="dashboard catalog-page">
    <header className="catalog-header"><div><p className="eyebrow">Question Library</p><h1>Kelompok Spatial Thinking</h1><p>Kelompokkan soal berdasarkan indikator Spatial Thinking. Stimulus, media, dan konfigurasi WebGIS tetap diatur pada masing-masing soal.</p></div><div className="row-actions"><Link className="button button-secondary" href="/teacher/questions">Bank Soal</Link><Link className="button" href="/teacher/questions/groups/new">+ Kelompok Soal</Link></div></header>
    <section className="question-bank-list">
      {groups.map((group)=><article className="question-bank-row" key={group.id}>
        <div className="question-thumb">◎</div>
        <div className="question-main"><div className="question-tags"><span>{group.spatialMode?modeLabels[group.spatialMode]??group.spatialMode:"Spatial Thinking"}</span><span>{group.scope}</span>{group.topic&&<span>{group.topic}</span>}</div><h2>{group.title}</h2><p>{group.description||"Kelompok soal berdasarkan indikator Spatial Thinking."}</p><small>{group.questionCount} soal · {group.publishedCount} published · {group.draftCount} draft</small></div>
        <div className="row-actions"><Link href={`/teacher/questions?groupId=${group.id}`}>Lihat Soal</Link><Link href={`/teacher/questions/new?groupId=${group.id}`}>+ Tambah Soal</Link></div>
      </article>)}
    </section>
    {!groups.length&&<div className="empty-state"><strong>Belum ada Kelompok Spatial Thinking.</strong><p>Buat kelompok untuk Location, Condition, Influence, Region, Hierarchy, Analogies, Pattern, atau Association.</p><Link className="button" href="/teacher/questions/groups/new">Buat Kelompok Soal</Link></div>}
  </main>;
}
