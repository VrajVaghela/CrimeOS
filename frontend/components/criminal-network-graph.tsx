"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { NetworkNode, NetworkEdge } from "@/lib/criminalNetworkData";

export default function CriminalNetworkGraph({
  nodes,
  edges,
  onSelect,
}: {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onSelect?: (n: NetworkNode) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });

  // Responsive width tracking
  useEffect(() => {
    const handle = () => {
      if (ref.current?.parentElement) {
        setDims({ w: ref.current.parentElement.clientWidth, h: 520 });
      }
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Build / rebuild force simulation whenever nodes, edges, or dims change
  useEffect(() => {
    if (!ref.current || nodes.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const { w, h } = dims;
    const g = svg.append("g");

    // Zoom + pan
    svg.call(
      (d3.zoom<SVGSVGElement, unknown>() as any)
        .scaleExtent([0.3, 4])
        .on("zoom", (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr("transform", String(e.transform));
        })
    );

    const simNodes = nodes.map((n) => ({ ...n })) as (NetworkNode & d3.SimulationNodeDatum)[];
    const simEdges = edges.map((e) => ({ ...e })) as (NetworkEdge & d3.SimulationLinkDatum<NetworkNode & d3.SimulationNodeDatum>)[];

    const sim = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode & d3.SimulationNodeDatum, NetworkEdge & d3.SimulationLinkDatum<NetworkNode & d3.SimulationNodeDatum>>(simEdges)
          .id((d) => d.id)
          .distance(90)
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.size + 10));

    // ── Edges ──
    const link = g
      .append("g")
      .selectAll<SVGLineElement, typeof simEdges[0]>("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", (d) => (d.type === "gang_link" ? "#ef4444" : d.type === "financial" ? "#f59e0b" : "#1e3a5f"))
      .attr("stroke-width", (d) => (d.type === "gang_link" ? 1.5 : 0.8))
      .attr("stroke-opacity", (d) => (d.type === "gang_link" ? 0.5 : d.type === "financial" ? 0.4 : 0.2));

    // ── Nodes ──
    const node = g
      .append("g")
      .selectAll<SVGGElement, typeof simNodes[0]>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        (d3.drag<SVGGElement, typeof simNodes[0]>() as any)
          .on("start", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e: any, d: any) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_: MouseEvent, d: any) => onSelect?.(d as NetworkNode));

    // Outer translucent ring
    node
      .append("circle")
      .attr("r", (d: any) => d.size)
      .attr("fill", (d: any) => d.color)
      .attr("fill-opacity", 0.18)
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // Inner solid dot
    node
      .append("circle")
      .attr("r", (d: any) => d.size * 0.42)
      .attr("fill", (d: any) => d.color)
      .attr("fill-opacity", 0.9);

    // Pulsing ring for CRITICAL nodes
    node
      .filter((d: any) => d.risk === "CRITICAL")
      .append("circle")
      .attr("r", (d: any) => d.size)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.55)
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", (d: any) => `${d.size};${d.size * 1.9};${d.size}`)
      .attr("dur", "2s")
      .attr("repeatCount", "indefinite");

    // Label
    node
      .append("text")
      .text((d: any) => d.label.split(" ")[0])
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.size + 13)
      .attr("font-size", 9)
      .attr("font-family", "'JetBrains Mono', 'Space Mono', monospace")
      .attr("fill", "#94a3b8")
      .attr("pointer-events", "none");

    // Simulation tick
    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      sim.stop();
    };
  }, [nodes, edges, dims, onSelect]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${dims.w} ${dims.h}`}
      width="100%"
      height={dims.h}
      className="rounded-squircle border border-border bg-[#0c0c0c]"
      aria-label="Criminal network force-directed relationship graph"
    />
  );
}
