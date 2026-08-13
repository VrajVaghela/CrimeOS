"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";

import { EntityPivotPanel } from "@/components/entity-pivot-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiError,
  getCaseEntities,
  getEntityRelationships,
  getRelatedCases,
  syncEntities,
} from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import type {
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
} from "@/lib/types";

export default function OsintPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entities, setEntities] = useState<CaseEntityOut[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationshipOut[]>([]);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseOut[]>([]);

  const loadData = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [ents, rels, rcases] = await Promise.all([
        getCaseEntities(caseId),
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
      ]);
      setEntities(ents);
      setRelationships(rels);
      setRelatedCases(rcases);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("osint_page.load_error")
      );
    } finally {
      setLoading(false);
    }
  }, [caseId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSyncEntities = async () => {
    try {
      const updatedEnts = await syncEntities(caseId);
      setEntities(updatedEnts);
      const [rels, rcases] = await Promise.all([
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
      ]);
      setRelationships(rels);
      setRelatedCases(rcases);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("osint_page.sync_error")
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-full rounded-squircle" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[500px] rounded-squircle lg:col-span-2" />
          <Skeleton className="h-[500px] rounded-squircle" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("osint_page.load_error")}
        description={error}
        action={{ label: t("common.retry"), onClick: () => void loadData() }}
      />
    );
  }

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <PageHeader
        level="section"
        title={t("osint_page.title")}
        description={t("osint_page.subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        }
      />

      <EntityPivotPanel
        entities={entities}
        relationships={relationships}
        relatedCases={relatedCases}
        onSync={handleSyncEntities}
      />
    </div>
  );
}
