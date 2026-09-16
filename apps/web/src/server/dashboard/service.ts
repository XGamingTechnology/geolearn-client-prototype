import type { TeacherSession } from "@/server/auth/session";
import { listClasses } from "@/server/classes/service";
import { listQuestionBank } from "@/server/content/service";
import { listDatasets } from "@/server/data/service";
import { listTeacherAssignments } from "@/server/assessment/service";

export type TeacherDashboardSummary={
  activeClassCount:number;
  studentCount:number;
  activeAssignmentCount:number;
  questionCount:number;
  datasetCount:number;
  publishedQuestionCount:number;
  vectorDatasetCount:number;
  recentAssignments:Array<{
    id:string;
    title:string;
    className:string;
    quizTitle:string;
    status:string;
    attemptCount:number;
    submittedCount:number;
  }>;
};

export async function getTeacherDashboardSummary(session:TeacherSession):Promise<TeacherDashboardSummary>{
  const [classes,questions,datasets,assignments]=await Promise.all([
    listClasses(session),
    listQuestionBank(session),
    listDatasets(session),
    listTeacherAssignments(session),
  ]);

  const activeClasses=classes.filter((item)=>item.status==="ACTIVE");
  const activeAssignments=assignments.filter((item)=>item.status==="ACTIVE");

  return {
    activeClassCount:activeClasses.length,
    studentCount:activeClasses.reduce((sum,item)=>sum+item.studentCount,0),
    activeAssignmentCount:activeAssignments.length,
    questionCount:questions.length,
    datasetCount:datasets.length,
    publishedQuestionCount:questions.filter((item)=>item.versionStatus==="PUBLISHED").length,
    vectorDatasetCount:datasets.filter((item)=>item.dataKind==="VECTOR"&&item.versionStatus==="PUBLISHED").length,
    recentAssignments:assignments.slice(0,3).map((item)=>({
      id:item.id,
      title:item.title,
      className:item.className,
      quizTitle:item.quizTitle,
      status:item.status,
      attemptCount:item.attemptCount,
      submittedCount:item.submittedCount,
    })),
  };
}
