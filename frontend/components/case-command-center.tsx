import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Activity,
  User,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  Mail,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowSpine } from "@/components/workflow-spine";
import { NextBestAction } from "@/components/next-best-action";
import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  getCommandCenter,
  getCase,
  getRequests,
  getCaseResponses,
  getCaseEntities,
  getEntityRelationships,
  getRelatedCases,
  syncEntities,
} from "@/lib/api";
import type {
  CommandCenterOut,
  CaseDetailOut,
  LegalRequestOut,
  ProviderResponseOut,
  CaseEntityOut,
  EntityRelationshipOut,
  RelatedCaseOut,
} from "@/lib/types";
import { EntityPivotPanel } from "@/components/entity-pivot-panel";

interface CaseCommandCenterProps {
  caseId: string;
}

export function CaseCommandCenter({ caseId }: CaseCommandCenterProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commandData, setCommandData] = useState<CommandCenterOut | null>(null);
  const [caseData, setCaseData] = useState<CaseDetailOut | null>(null);
  const [requests, setRequests] = useState<LegalRequestOut[]>([]);
  const [responses, setResponses] = useState<ProviderResponseOut[]>([]);
  const [entities, setEntities] = useState<CaseEntityOut[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationshipOut[]>([]);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseOut[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cmd, details, reqs, resps, ents, rels, rcases] = await Promise.all([
        getCommandCenter(caseId),
        getCase(caseId),
        getRequests(caseId),
        getCaseResponses(caseId),
        getCaseEntities(caseId),
        getEntityRelationships(caseId),
        getRelatedCases(caseId),
      ]);
      setCommandData(cmd);
      setCaseData(details);
      setRequests(reqs);
      setResponses(resps);
      setEntities(ents);
      setRelationships(rels);
      setRelatedCases(rcases);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  };

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
      console.error("Failed to sync case entities:", e);
    }
  };

  useEffect(() => {
    if (caseId) {
      void loadData();
    }
  }, [caseId]);

  const handleActionExecute = (actionType: string) => {
    const mapping: Record<string, string> = {
      upload_complaint: "ingestion",
      verify_entities: "ingestion",
      generate_path: "path",
      draft_request: "requests",
      trigger_response: "responses",
      generate_summary: "summary",
    };
    const target = mapping[actionType];
    if (target) {
      router.push(`/cases/${caseId}/${target}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !commandData) {
    return (
      <div className="bg-destructive/15 border border-destructive/30 rounded-xl p-5 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm font-semibold text-destructive">{error || "Data not available"}</p>
        <Button onClick={() => void loadData()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const { workflow } = commandData;

  // Extract entities from case complaints
  const allEntities = caseData?.complaints?.flatMap((c) => c.entities) || [];
  const displayEntities = allEntities.slice(0, 5); // Limit to top 5 for overview

  // Entity icon mapper
  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "person":
        return <User className="h-4 w-4 text-info" />;
      case "phone":
      case "phone_number":
        return <Phone className="h-4 w-4 text-primary" />;
      case "bank_account":
      case "account":
        return <CreditCard className="h-4 w-4 text-success" />;
      case "date":
        return <Calendar className="h-4 w-4 text-accent" />;
      case "location":
        return <MapPin className="h-4 w-4 text-rose" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title / Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Case Command Center / केस कमांड सेंटर
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time workflow monitoring, prioritized steps, and entity intelligence lookup.
          </p>
        </div>
        <Button
          onClick={() => void loadData()}
          variant="outline"
          size="sm"
          className="border-border/40 text-muted-foreground hover:text-foreground"
        >
          Refresh Control
        </Button>
      </div>

      {/* Workflow Spine Indicator */}
      <Card className="border border-border/40 bg-card/50 backdrop-blur-md">
        <CardContent className="pt-6">
          <WorkflowSpine stages={workflow.stages} currentStage={workflow.current_stage} />
        </CardContent>
      </Card>

      {/* Next Best Action Banner */}
      <NextBestAction
        actionType={workflow.next_action_type}
        actionLabel={workflow.next_action_label}
        blockerCodes={workflow.blocker_codes}
        onAction={handleActionExecute}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Entities Overview */}
          {/* Key Entities Overview */}
          <Card className="border border-border/60 bg-card p-5">
            <EntityPivotPanel
              entities={entities}
              relationships={relationships}
              relatedCases={relatedCases}
              onSync={handleSyncEntities}
            />
          </Card>

          {/* Active Requests & Analytics Insights */}
          <Card className="border border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                Requests & Response Insights / कानूनी अनुरोध और अंतर्दृष्टि
              </CardTitle>
              {requests.length > 0 && (
                <Button
                  onClick={() => router.push(`/cases/${caseId}/requests`)}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80 gap-1"
                >
                  Manage Requests <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requests summary */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                  Dispatched Requests
                </h4>
                {requests.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-border/40 rounded-lg">
                    <Mail className="h-6 w-6 text-muted-foreground mx-auto mb-1 opacity-50" />
                    <p className="text-[11px] text-muted-foreground">No requests drafted or dispatched.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 bg-secondary/30 border border-border/30 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate font-heading">{req.provider_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {req.recipient_email}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest Response insight */}
              {responses.length > 0 && (
                <div className="border-t border-border/30 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
                    Latest Provider Response Insight
                  </h4>
                  <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs font-semibold font-heading text-success">
                        AI correlation flags
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &quot;{responses[0].ai_insights.slice(0, 180)}
                      {responses[0].ai_insights.length > 180 ? "..." : ""}&quot;
                    </p>
                    <div className="mt-2 text-right">
                      <Button
                        onClick={() => router.push(`/cases/${caseId}/responses`)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-success hover:bg-success/10 gap-1 font-mono"
                      >
                        View Full Insights <ArrowRight className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="space-y-6">
          {/* Case Health & Detail Progress */}
          <Card className="border border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Investigation Progress / जांच प्रगति
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="text-primary font-mono">{workflow.completion_percentage}%</span>
                </div>
                <div className="w-full bg-secondary/80 rounded-full h-2 border border-border/20 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 glow-primary"
                    style={{ width: `${workflow.completion_percentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2.5 border-t border-border/30 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Case status:</span>
                  <span className="font-semibold uppercase font-mono text-primary">
                    {commandData.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crime Type:</span>
                  <span className="font-semibold font-heading">
                    {commandData.crime_type ?? "Unclassified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created At:</span>
                  <span className="font-semibold font-mono">
                    {new Date(commandData.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ingested Files:</span>
                  <span className="font-semibold font-mono">
                    {caseData?.complaints?.length ?? 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Logs */}
          <Card className="border border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold font-heading flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Recent Case Log / हालिया गतिविधि
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workflow.recent_activity.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No events recorded in the audit trail.</p>
                </div>
              ) : (
                <div className="relative pl-4 border-l border-border/40 space-y-4">
                  {workflow.recent_activity.map((activity) => (
                    <div key={activity.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background group-hover:scale-125 transition-transform" />
                      
                      <div>
                        <p className="text-xs font-semibold font-heading text-foreground">
                          {activity.action.replace(/_/g, " ").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-mono">
                          <span>{activity.actor_name || "System"}</span>
                          <span>•</span>
                          <span>
                            {new Date(activity.timestamp).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
