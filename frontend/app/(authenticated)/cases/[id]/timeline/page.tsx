"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { TimelineWorkspace } from "@/components/timeline-workspace";
import { getCaseTimeline } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { CctvPinOut, TimelineEventOut } from "@/lib/types";

export default function TimelinePage() {
  const params = useParams();
  const caseId = params.id as string;

  const [events, setEvents] = useState<TimelineEventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSynthesizing(true);
    try {
      const data = await getCaseTimeline(caseId);
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load timeline.");
    } finally {
      setLoading(false);
      setSynthesizing(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      void load();
    }
  }, [caseId, load]);

  function handlePinned(result: CctvPinOut) {
    setEvents((prev) =>
      [...prev, result.event].sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      )
    );
  }

  function handleNoteAdded(event: TimelineEventOut) {
    setEvents((prev) =>
      [...prev, event].sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      )
    );
  }

  return (
    <TimelineWorkspace
      caseId={caseId}
      events={events}
      loading={loading}
      error={error}
      synthesizing={synthesizing}
      onRefresh={load}
      onPinned={handlePinned}
      onNoteAdded={handleNoteAdded}
    />
  );
}
