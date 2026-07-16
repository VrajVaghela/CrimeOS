"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CaseIndexPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/cases/${id as string}/ingestion`);
  }, [id, router]);

  return null;
}
