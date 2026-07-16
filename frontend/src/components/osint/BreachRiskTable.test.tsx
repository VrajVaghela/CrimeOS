import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { BreachRiskTable } from "./BreachRiskTable";
import type { DataBreach } from "../../types/osint";

const breaches: DataBreach[] = [
  {
    id: "1",
    scan_id: "scan-1",
    breach_name: "Low Risk Leak",
    breach_domain: "low.example.com",
    leak_date: "2024-01-01",
    exposed_data_classes: ["Email Addresses"],
    record_count: 1000,
    severity: "LOW",
    source_note: "Email-only exposure",
    discovered_at: new Date().toISOString(),
  },
  {
    id: "2",
    scan_id: "scan-1",
    breach_name: "Critical Vault Breach",
    breach_domain: "critical.example.com",
    leak_date: "2024-02-01",
    exposed_data_classes: ["Passwords", "Financial Credentials"],
    record_count: 500000,
    severity: "CRITICAL",
    source_note: "Credential dump",
    discovered_at: new Date().toISOString(),
  },
];

const emptyBreaches: DataBreach[] = [];

test("sorts breaches by severity and renders severity labels", () => {
  render(<BreachRiskTable breaches={breaches} />);

  const rows = screen.getAllByTestId(/breach-row-/);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Critical Vault Breach");
  expect(rows[1]).toHaveTextContent("Low Risk Leak");
  expect(rows[0]).toHaveTextContent("CRITICAL");
  expect(rows[1]).toHaveTextContent("LOW");
});

test("highlights critical rows for password/financial exposures", () => {
  render(<BreachRiskTable breaches={breaches} />);

  const criticalRow = screen.getAllByTestId(/breach-row-/)[0];
  expect(criticalRow).toHaveClass("border-l-4");
  expect(criticalRow).toHaveClass("border-rose-600");
});

test("renders empty state when no breaches exist", () => {
  render(<BreachRiskTable breaches={emptyBreaches} />);

  expect(screen.getByText("No breach data was found for this entity.")).toBeInTheDocument();
});
