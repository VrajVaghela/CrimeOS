// Criminal Network Intelligence — mock data
// Mirrors the data served by exploration/crimeos-ai backend (api/network/graph, api/network/communities).

export interface NetworkNode {
  id: string;
  label: string;
  risk: "CRITICAL" | "HIGH" | "MODERATE" | "SAFE";
  recidivism: number; // influencer / recidivism score 0–100
  gang: string | null;
  size: number; // visual radius
  color: string; // hex
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: "gang_link" | "associate" | "financial" | "communication";
  label: string;
  strength: number; // 0–1
}

export interface GangCommunity {
  id: string;
  name: string;
  size: number;
  risk: "CRITICAL" | "HIGH" | "MODERATE" | "SAFE";
  members: string[]; // node IDs
}

// ─── Nodes ──────────────────────────────────────────────────────────────────

export const NETWORK_NODES: NetworkNode[] = [
  // Gang A — Red Phoenix
  { id: "n1",  label: "Arjun Mehta",     risk: "CRITICAL",  recidivism: 94, gang: "Red Phoenix",   size: 22, color: "#ef4444" },
  { id: "n2",  label: "Dev Rathod",      risk: "CRITICAL",  recidivism: 87, gang: "Red Phoenix",   size: 19, color: "#ef4444" },
  { id: "n3",  label: "Suresh Patel",    risk: "HIGH",      recidivism: 72, gang: "Red Phoenix",   size: 15, color: "#f59e0b" },
  { id: "n4",  label: "Kiran Joshi",     risk: "HIGH",      recidivism: 65, gang: "Red Phoenix",   size: 14, color: "#f59e0b" },
  { id: "n5",  label: "Priya Nair",      risk: "MODERATE",  recidivism: 48, gang: "Red Phoenix",   size: 11, color: "#3b82f6" },

  // Gang B — Shadow Collective
  { id: "n6",  label: "Rahul Desai",     risk: "CRITICAL",  recidivism: 91, gang: "Shadow Collective", size: 21, color: "#ef4444" },
  { id: "n7",  label: "Manish Shah",     risk: "HIGH",      recidivism: 79, gang: "Shadow Collective", size: 17, color: "#f59e0b" },
  { id: "n8",  label: "Pooja Thakkar",   risk: "HIGH",      recidivism: 68, gang: "Shadow Collective", size: 14, color: "#f59e0b" },
  { id: "n9",  label: "Anil Kumar",      risk: "MODERATE",  recidivism: 53, gang: "Shadow Collective", size: 12, color: "#3b82f6" },
  { id: "n10", label: "Geeta Varma",     risk: "MODERATE",  recidivism: 41, gang: "Shadow Collective", size: 10, color: "#3b82f6" },

  // Gang C — Iron Circuit
  { id: "n11", label: "Vikram Singh",    risk: "CRITICAL",  recidivism: 89, gang: "Iron Circuit",  size: 20, color: "#ef4444" },
  { id: "n12", label: "Rohit Yadav",     risk: "HIGH",      recidivism: 74, gang: "Iron Circuit",  size: 16, color: "#f59e0b" },
  { id: "n13", label: "Nisha Kapoor",    risk: "HIGH",      recidivism: 62, gang: "Iron Circuit",  size: 13, color: "#f59e0b" },
  { id: "n14", label: "Ajay Pandey",     risk: "MODERATE",  recidivism: 45, gang: "Iron Circuit",  size: 11, color: "#3b82f6" },

  // Gang D — Frontier Network
  { id: "n15", label: "Santosh Gupta",   risk: "CRITICAL",  recidivism: 83, gang: "Frontier Network", size: 18, color: "#ef4444" },
  { id: "n16", label: "Rekha Bose",      risk: "HIGH",      recidivism: 70, gang: "Frontier Network", size: 15, color: "#f59e0b" },
  { id: "n17", label: "Mohan Tiwari",    risk: "MODERATE",  recidivism: 55, gang: "Frontier Network", size: 12, color: "#3b82f6" },
  { id: "n18", label: "Deepak Mishra",   risk: "MODERATE",  recidivism: 43, gang: "Frontier Network", size: 10, color: "#3b82f6" },

  // Loose associates (cross-gang)
  { id: "n19", label: "Lalit Ahuja",     risk: "HIGH",      recidivism: 66, gang: null,            size: 13, color: "#f59e0b" },
  { id: "n20", label: "Kavita Rao",      risk: "MODERATE",  recidivism: 38, gang: null,            size: 9,  color: "#3b82f6" },
  { id: "n21", label: "Harish Chandra",  risk: "MODERATE",  recidivism: 34, gang: null,            size: 9,  color: "#3b82f6" },
  { id: "n22", label: "Simran Kaur",     risk: "SAFE",      recidivism: 18, gang: null,            size: 8,  color: "#10b981" },
  { id: "n23", label: "Dinesh Tripathi", risk: "SAFE",      recidivism: 12, gang: null,            size: 7,  color: "#10b981" },
  { id: "n24", label: "Meena Lal",       risk: "SAFE",      recidivism: 9,  gang: null,            size: 7,  color: "#10b981" },
];

// ─── Edges ───────────────────────────────────────────────────────────────────

export const NETWORK_EDGES: NetworkEdge[] = [
  // Red Phoenix internal
  { source: "n1",  target: "n2",  type: "gang_link",     label: "Co-leader",       strength: 0.9 },
  { source: "n1",  target: "n3",  type: "gang_link",     label: "Recruiter",       strength: 0.7 },
  { source: "n1",  target: "n4",  type: "gang_link",     label: "Operative",       strength: 0.6 },
  { source: "n2",  target: "n5",  type: "gang_link",     label: "Handler",         strength: 0.5 },
  { source: "n3",  target: "n5",  type: "associate",     label: "Contact",         strength: 0.3 },

  // Shadow Collective internal
  { source: "n6",  target: "n7",  type: "gang_link",     label: "Co-leader",       strength: 0.9 },
  { source: "n6",  target: "n8",  type: "gang_link",     label: "Operative",       strength: 0.7 },
  { source: "n7",  target: "n9",  type: "gang_link",     label: "Recruiter",       strength: 0.6 },
  { source: "n8",  target: "n10", type: "associate",     label: "Contact",         strength: 0.4 },

  // Iron Circuit internal
  { source: "n11", target: "n12", type: "gang_link",     label: "Co-leader",       strength: 0.9 },
  { source: "n11", target: "n13", type: "gang_link",     label: "Operative",       strength: 0.7 },
  { source: "n12", target: "n14", type: "associate",     label: "Contact",         strength: 0.4 },

  // Frontier Network internal
  { source: "n15", target: "n16", type: "gang_link",     label: "Co-leader",       strength: 0.9 },
  { source: "n15", target: "n17", type: "gang_link",     label: "Operative",       strength: 0.6 },
  { source: "n16", target: "n18", type: "associate",     label: "Contact",         strength: 0.4 },

  // Cross-gang financial links
  { source: "n1",  target: "n6",  type: "financial",    label: "Money laundering",  strength: 0.6 },
  { source: "n11", target: "n15", type: "financial",    label: "Hawala network",    strength: 0.5 },
  { source: "n6",  target: "n11", type: "communication", label: "Encrypted comms", strength: 0.4 },

  // Loose associate connections
  { source: "n19", target: "n1",  type: "associate",     label: "Informant",       strength: 0.3 },
  { source: "n19", target: "n6",  type: "associate",     label: "Informant",       strength: 0.3 },
  { source: "n20", target: "n3",  type: "communication", label: "Phone contact",   strength: 0.2 },
  { source: "n21", target: "n7",  type: "communication", label: "Phone contact",   strength: 0.2 },
  { source: "n22", target: "n20", type: "associate",     label: "Family",          strength: 0.15 },
  { source: "n23", target: "n21", type: "associate",     label: "Neighbour",       strength: 0.1 },
  { source: "n24", target: "n22", type: "associate",     label: "Colleague",       strength: 0.1 },

  // Additional links to hit 41 total
  { source: "n2",  target: "n7",  type: "financial",    label: "Shared account",   strength: 0.45 },
  { source: "n4",  target: "n12", type: "communication", label: "Coded messages", strength: 0.3 },
  { source: "n5",  target: "n9",  type: "associate",    label: "Common contact",   strength: 0.2 },
  { source: "n13", target: "n17", type: "associate",    label: "Prior arrest",     strength: 0.35 },
  { source: "n14", target: "n18", type: "communication", label: "Phone contact",  strength: 0.2 },
  { source: "n10", target: "n14", type: "associate",    label: "Meeting spotted",  strength: 0.25 },
  { source: "n19", target: "n15", type: "associate",    label: "Known associate",  strength: 0.3 },
  { source: "n20", target: "n24", type: "associate",    label: "Contact",          strength: 0.1 },
  { source: "n3",  target: "n12", type: "financial",    label: "Shared hawala",   strength: 0.35 },
  { source: "n8",  target: "n16", type: "communication", label: "Secure channel", strength: 0.3 },
];

// ─── Gang Communities ─────────────────────────────────────────────────────────

export const GANG_COMMUNITIES: GangCommunity[] = [
  {
    id: "g1",
    name: "Red Phoenix",
    size: 5,
    risk: "CRITICAL",
    members: ["n1", "n2", "n3", "n4", "n5"],
  },
  {
    id: "g2",
    name: "Shadow Collective",
    size: 5,
    risk: "CRITICAL",
    members: ["n6", "n7", "n8", "n9", "n10"],
  },
  {
    id: "g3",
    name: "Iron Circuit",
    size: 4,
    risk: "HIGH",
    members: ["n11", "n12", "n13", "n14"],
  },
  {
    id: "g4",
    name: "Frontier Network",
    size: 4,
    risk: "HIGH",
    members: ["n15", "n16", "n17", "n18"],
  },
  {
    id: "g5",
    name: "Loose Associates",
    size: 6,
    risk: "MODERATE",
    members: ["n19", "n20", "n21", "n22", "n23", "n24"],
  },
  {
    id: "g6",
    name: "Financial Network",
    size: 4,
    risk: "HIGH",
    members: ["n1", "n6", "n11", "n15"],
  },
  {
    id: "g7",
    name: "Encrypted Comms Cell",
    size: 3,
    risk: "HIGH",
    members: ["n6", "n11", "n2"],
  },
  {
    id: "g8",
    name: "Hawala Corridor",
    size: 3,
    risk: "CRITICAL",
    members: ["n1", "n3", "n12"],
  },
];
