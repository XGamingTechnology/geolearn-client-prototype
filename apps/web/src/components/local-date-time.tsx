"use client";

export function LocalDateTime({value}:{value:Date|string}) {
  const date = value instanceof Date ? value : new Date(value);
  const label = new Intl.DateTimeFormat("id-ID", {dateStyle:"medium",timeStyle:"short"}).format(date);
  return <time dateTime={date.toISOString()} suppressHydrationWarning>{label}</time>;
}

