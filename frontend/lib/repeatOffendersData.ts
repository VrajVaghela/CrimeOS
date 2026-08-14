export interface CrimeTimelineItem {
  offense: string;
  date: string;
}

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface OffenderProfile {
  id: string;
  name: string;
  alias: string;
  age: number;
  gender: "Male" | "Female";
  recidivismScore: number;
  riskLevel: RiskLevel;
  totalCases: number;
  location: string;
  crimeTimeline: CrimeTimelineItem[];
}

export const REPEAT_OFFENDERS_DATA: OffenderProfile[] = [
  {
    id: "off-001",
    name: "Rajan Malik",
    alias: "'Rajan'",
    age: 31,
    gender: "Male",
    recidivismScore: 89.7,
    riskLevel: "CRITICAL",
    totalCases: 259,
    location: "Sector 20, Theta Ward",
    crimeTimeline: [
      { offense: "Drug Offense", date: "2026-06-18" },
      { offense: "Kidnapping", date: "2026-06-16" },
      { offense: "Murder", date: "2026-06-07" },
      { offense: "Armed Robbery", date: "2026-05-22" },
      { offense: "Extortion", date: "2026-04-11" },
    ],
  },
  {
    id: "off-002",
    name: "Pradeep Kumar",
    alias: "'Pradeep'",
    age: 25,
    gender: "Male",
    recidivismScore: 95.0,
    riskLevel: "CRITICAL",
    totalCases: 284,
    location: "Cyber City, Zone 4",
    crimeTimeline: [
      { offense: "Financial Fraud", date: "2026-07-02" },
      { offense: "Identity Theft", date: "2026-06-25" },
      { offense: "Cyber Extortion", date: "2026-06-10" },
      { offense: "Phishing Racket", date: "2026-05-14" },
    ],
  },
  {
    id: "off-003",
    name: "Pranav Sen",
    alias: "'Pranav'",
    age: 54,
    gender: "Male",
    recidivismScore: 92.1,
    riskLevel: "CRITICAL",
    totalCases: 236,
    location: "Vastrapur Industrial Area",
    crimeTimeline: [
      { offense: "Arms Trafficking", date: "2026-06-29" },
      { offense: "Aggravated Assault", date: "2026-06-12" },
      { offense: "Smuggling", date: "2026-05-30" },
      { offense: "Money Laundering", date: "2026-04-19" },
    ],
  },
  {
    id: "off-004",
    name: "Vijay Menon",
    alias: "'Vijay'",
    age: 42,
    gender: "Male",
    recidivismScore: 84.5,
    riskLevel: "HIGH",
    totalCases: 198,
    location: "Railway Station Road",
    crimeTimeline: [
      { offense: "Vehicle Theft", date: "2026-07-01" },
      { offense: "Burglary", date: "2026-06-20" },
      { offense: "Grand Larceny", date: "2026-05-28" },
      { offense: "Fencing Stolen Goods", date: "2026-04-30" },
    ],
  },
  {
    id: "off-005",
    name: "Mohit Bajaj",
    alias: "'Mohit'",
    age: 38,
    gender: "Male",
    recidivismScore: 78.3,
    riskLevel: "HIGH",
    totalCases: 172,
    location: "Varachha Main Market",
    crimeTimeline: [
      { offense: "Counterfeit Currency", date: "2026-06-22" },
      { offense: "Credit Card Fraud", date: "2026-06-05" },
      { offense: "Wire Fraud", date: "2026-05-18" },
    ],
  },
  {
    id: "off-006",
    name: "Sunita Sharma",
    alias: "'Sunita'",
    age: 29,
    gender: "Female",
    recidivismScore: 74.6,
    riskLevel: "HIGH",
    totalCases: 145,
    location: "Adajan Circle",
    crimeTimeline: [
      { offense: "Corporate Espionage", date: "2026-06-27" },
      { offense: "Document Forgery", date: "2026-06-08" },
      { offense: "Embezzlement", date: "2026-05-02" },
    ],
  },
  {
    id: "off-007",
    name: "Suresh Patil",
    alias: "'Suresh'",
    age: 47,
    gender: "Male",
    recidivismScore: 68.9,
    riskLevel: "MEDIUM",
    totalCases: 128,
    location: "Udhna GIDC",
    crimeTimeline: [
      { offense: "Illegal Gambling", date: "2026-06-15" },
      { offense: "Liquor Smuggling", date: "2026-05-24" },
      { offense: "Bribe Solicitation", date: "2026-04-14" },
    ],
  },
  {
    id: "off-008",
    name: "Anil Deshmukh",
    alias: "'Anil'",
    age: 33,
    gender: "Male",
    recidivismScore: 64.2,
    riskLevel: "MEDIUM",
    totalCases: 95,
    location: "Katargam Industrial Hub",
    crimeTimeline: [
      { offense: "Vandalism", date: "2026-06-19" },
      { offense: "Public Nuisance", date: "2026-05-29" },
      { offense: "Trespassing", date: "2026-05-08" },
    ],
  },
  {
    id: "off-009",
    name: "Vicky Verma",
    alias: "'Vicky'",
    age: 27,
    gender: "Male",
    recidivismScore: 58.0,
    riskLevel: "MEDIUM",
    totalCases: 84,
    location: "Palanpur Canal Road",
    crimeTimeline: [
      { offense: "Snatching", date: "2026-06-24" },
      { offense: "Pickpocketing", date: "2026-06-01" },
      { offense: "Unlawful Assembly", date: "2026-04-26" },
    ],
  },
  {
    id: "off-010",
    name: "Pooja Hegde",
    alias: "'Pooja'",
    age: 34,
    gender: "Female",
    recidivismScore: 51.5,
    riskLevel: "MEDIUM",
    totalCases: 62,
    location: "Bhestan Housing Board",
    crimeTimeline: [
      { offense: "Insurance Claim Scam", date: "2026-06-11" },
      { offense: "Identity Misrepresentation", date: "2026-05-15" },
    ],
  },
  {
    id: "off-011",
    name: "Suraj Bhan",
    alias: "'Suraj'",
    age: 36,
    gender: "Male",
    recidivismScore: 42.0,
    riskLevel: "LOW",
    totalCases: 48,
    location: "Piplod Avenue",
    crimeTimeline: [
      { offense: "Traffic Violation Repeat", date: "2026-06-04" },
      { offense: "Minor Altercation", date: "2026-05-09" },
    ],
  },
  {
    id: "off-012",
    name: "Ramesh Yadav",
    alias: "'Ramesh'",
    age: 50,
    gender: "Male",
    recidivismScore: 35.5,
    riskLevel: "LOW",
    totalCases: 32,
    location: "Dindoli Extension",
    crimeTimeline: [
      { offense: "Illegal Parking Racket", date: "2026-05-31" },
      { offense: "Noise Pollution Violation", date: "2026-04-20" },
    ],
  },
  {
    id: "off-013",
    name: "Deepak Sharma",
    alias: "'Deepak'",
    age: 30,
    gender: "Male",
    recidivismScore: 28.0,
    riskLevel: "LOW",
    totalCases: 22,
    location: "Vesu Canal Corridor",
    crimeTimeline: [
      { offense: "Unauthorized Hawking", date: "2026-05-19" },
      { offense: "Public Disturbance", date: "2026-04-05" },
    ],
  },
  {
    id: "off-014",
    name: "Meena Patel",
    alias: "'Meena'",
    age: 41,
    gender: "Female",
    recidivismScore: 22.4,
    riskLevel: "LOW",
    totalCases: 14,
    location: "City Light Crossing",
    crimeTimeline: [
      { offense: "Shoplifting", date: "2026-05-12" },
      { offense: "Minor Fraud", date: "2026-04-01" },
    ],
  },
  {
    id: "off-015",
    name: "Imran Khan",
    alias: "'Imran'",
    age: 28,
    gender: "Male",
    recidivismScore: 18.0,
    riskLevel: "LOW",
    totalCases: 8,
    location: "Chowk Bazar Area",
    crimeTimeline: [
      { offense: "Loitering", date: "2026-04-28" },
      { offense: "Minor Damage to Property", date: "2026-03-15" },
    ],
  },
];
