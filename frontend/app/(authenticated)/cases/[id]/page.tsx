"use client";

export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { CaseCommandCenter } from "@/components/case-command-center";

export default function CaseIndexPage() {
  const { id } = useParams();
  const caseId = id as string;

  return <CaseCommandCenter caseId={caseId} />;
}
