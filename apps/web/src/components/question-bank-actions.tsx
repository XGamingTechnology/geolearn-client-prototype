"use client";

import {ConfirmAction} from "./confirm-action";

export function QuestionBankLifecycleAction({
  action,
  label,
  confirmText,
  tone="default",
}:{
  action:string;
  label:string;
  confirmText:string;
  tone?:"default"|"danger";
}){
  const title=tone==="danger"?`${label} draft?`:`${label} soal?`;
  return <ConfirmAction
    action={action}
    triggerLabel={label}
    title={title}
    description={confirmText}
    confirmLabel={label}
    tone={tone}
    triggerClassName={tone==="danger"?"question-action danger":"question-action"}
  />;
}
