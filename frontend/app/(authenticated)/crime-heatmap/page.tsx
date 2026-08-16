import { redirect } from "next/navigation";

/**
 * Legacy alias for the canonical /heatmap route.
 *
 * This must be a redirect, not `export { default } from "../heatmap/page"`.
 * Re-exporting another route's page module makes two App Router entries share
 * one module, which corrupts the client-reference manifest — Next throws
 * "Cannot read properties of undefined (reading 'clientModules')" and stops
 * serving the client chunks for both routes, so the page never hydrates.
 */
export default function CrimeHeatmapPage() {
  redirect("/heatmap");
}
