"use client";

import type { FormEvent } from "react";

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
  function confirm(event:FormEvent<HTMLFormElement>){
    if(!window.confirm(confirmText))event.preventDefault();
  }
  return <form action={action} method="post" onSubmit={confirm}>
    <button className={tone==="danger"?"question-action danger":"question-action"} type="submit">{label}</button>
  </form>;
}
