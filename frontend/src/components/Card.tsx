import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export default function Card({ title, children }: Props) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-400">{title}</h3>
      {children}
    </div>
  );
}
