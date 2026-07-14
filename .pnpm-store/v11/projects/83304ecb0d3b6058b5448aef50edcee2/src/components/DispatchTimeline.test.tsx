import { render, screen } from "@testing-library/react";
import { expect } from "vitest";
import {
  DispatchTimeline,
  getDispatchStepStates,
  DISPATCH_STEPS,
} from "./DispatchTimeline";
import type { LegalRequest } from "../types/legalRequest";

const baseRequest: LegalRequest = {
  id: "req-1",
  case_id: "case-1",
  request_number: "LERS/2026/000001",
  provider_id: "prov-1",
  template_type: "CDR_REQUEST",
  linked_entity_ids: [],
  status: "QUEUED",
  rendered_doc_path: null,
  drafted_by: "officer",
  approved_by: null,
  sla_due_at: new Date(Date.now() + 86400000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("getDispatchStepStates", () => {
  it("returns overdue for OVERDUE status", () => {
    expect(getDispatchStepStates("OVERDUE")).toBe("overdue");
  });

  it("returns all pending for DRAFTED", () => {
    const states = getDispatchStepStates("DRAFTED");
    expect(states).toEqual(["pending", "pending", "pending", "pending"]);
  });

  it("highlights QUEUED step for QUEUED status", () => {
    const states = getDispatchStepStates("QUEUED");
    expect(states).toEqual(["current", "pending", "pending", "pending"]);
  });

  it("highlights SENT step for SENT status", () => {
    const states = getDispatchStepStates("SENT");
    expect(states).toEqual(["completed", "current", "pending", "pending"]);
  });

  it("highlights ACKNOWLEDGED step for ACKNOWLEDGED status", () => {
    const states = getDispatchStepStates("ACKNOWLEDGED");
    expect(states).toEqual(["completed", "completed", "current", "pending"]);
  });

  it("highlights RESPONDED step for RESPONDED status", () => {
    const states = getDispatchStepStates("RESPONDED");
    expect(states).toEqual([
      "completed",
      "completed",
      "completed",
      "current",
    ]);
  });

  it("returns all pending for REJECTED_BY_PROVIDER", () => {
    const states = getDispatchStepStates("REJECTED_BY_PROVIDER");
    expect(states).toEqual(["pending", "pending", "pending", "pending"]);
  });
});

describe("DispatchTimeline", () => {
  it("renders overdue badge instead of step tracker for OVERDUE", () => {
    render(
      <DispatchTimeline
        request={{ ...baseRequest, status: "OVERDUE" }}
        dispatchEvents={[]}
      />
    );
    expect(screen.getByText("OVERDUE")).toBeInTheDocument();
    DISPATCH_STEPS.forEach((step) => {
      expect(screen.queryByTestId(`step-${step}`)).not.toBeInTheDocument();
    });
  });

  it("marks the correct step as current for SENT status", () => {
    render(
      <DispatchTimeline
        request={{ ...baseRequest, status: "SENT" }}
        dispatchEvents={[]}
      />
    );
    expect(screen.getByTestId("step-SENT")).toHaveAttribute(
      "data-state",
      "current"
    );
    expect(screen.getByTestId("step-QUEUED")).toHaveAttribute(
      "data-state",
      "completed"
    );
    expect(screen.getByTestId("step-ACKNOWLEDGED")).toHaveAttribute(
      "data-state",
      "pending"
    );
  });

  it("marks all steps completed-through-current for ACKNOWLEDGED", () => {
    render(
      <DispatchTimeline
        request={{ ...baseRequest, status: "ACKNOWLEDGED" }}
        dispatchEvents={[]}
      />
    );
    expect(screen.getByTestId("step-ACKNOWLEDGED")).toHaveAttribute(
      "data-state",
      "current"
    );
    expect(screen.getByTestId("step-QUEUED")).toHaveAttribute(
      "data-state",
      "completed"
    );
    expect(screen.getByTestId("step-SENT")).toHaveAttribute(
      "data-state",
      "completed"
    );
  });
});
