import type {ReactNode} from "react";
import styles from "./assessment-question-workspace.module.css";

/** Presentation-only shell shared by the student runtime and teacher preview. */
export function AssessmentQuestionWorkspace({
  context,stimulus,activity,response,actions,status,after,className="",
}:{
  context:ReactNode;
  stimulus:ReactNode;
  activity?:ReactNode;
  response?:ReactNode;
  actions?:ReactNode;
  status?:ReactNode;
  after?:ReactNode;
  className?:string;
}){
  return <section className={`${styles.root} ${className}`}>
    <div className={styles.workspace}>
      <div className={styles.questionPane}>
        <div className={styles.context}>{context}</div>
        {activity&&<div className={styles.activity}>{activity}</div>}
        {response&&<div className={styles.response}>{response}</div>}
        {actions&&<div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.mapPane}>{stimulus}</div>
    </div>
    {after&&<div className={styles.after}>{after}</div>}
    {status&&<div className={styles.status}>{status}</div>}
  </section>;
}
