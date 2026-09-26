import { GisStudioReal } from "@/components/gis-studio-real";
import { requireTeacherSession } from "@/server/auth/session";
import { getOrCreateDefaultProject, listDatasets, listProjectLayers } from "@/server/data/service";

export default async function GisStudioPage({searchParams}:{searchParams:Promise<{dataset?:string}>}) {
  const session=await requireTeacherSession();
  const project=await getOrCreateDefaultProject(session);
  const [datasets,layers,{dataset}]=await Promise.all([
    listDatasets(session),
    listProjectLayers(session,project.id),
    searchParams,
  ]);

  return <GisStudioReal
    projectId={project.id}
    projectTitle={project.title}
    datasets={datasets.map((d)=>({id:d.id,title:d.title,versionId:d.versionId,geometryType:d.geometryType,featureCount:d.featureCount,scope:d.scope}))}
    initialLayers={layers}
    autoDatasetId={dataset}
  />;
}
