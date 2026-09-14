import { QuestionBuilderPreview } from "@/components/question-builder-preview";

export default function QuestionBuilderPage(){
  return (
    <main className="dashboard builder-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Question Builder</p><h1>Buat Soal Baru</h1><p>Wizard 8 langkah untuk stimulus multimodal, aktivitas GIS, response, validation, feedback, dan Student Preview.</p></div>
        <span className="status-pill">DRAFT PREVIEW</span>
      </header>
      <QuestionBuilderPreview />
    </main>
  );
}
