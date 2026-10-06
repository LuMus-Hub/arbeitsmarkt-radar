export type WorkMode = "Vor Ort" | "Hybrid" | "Remote";

export type Profile = {
  education: string;
  experience: string;
  roles: string[];
  skills: string[];
  workMode: WorkMode;
  relocation: boolean;
  preferredRegions: string[];
};

export type DemoJob = {
  title: string;
  company: string;
  mode: WorkMode;
  match: number;
};

export type Region = {
  id: string;
  name: string;
  state: string;
  x: number;
  y: number;
  longitude: number;
  latitude: number;
  baseJobs: number;
  demand: number;
  trend: number;
  salary: number;
  laborMarket: number;
  skillDemand: Record<string, number>;
  topSkills: string[];
  employers: string[];
  jobs: DemoJob[];
};

export const skillOptions = [
  "Projektmanagement",
  "Data Analytics",
  "CRM",
  "Salesforce",
  "Excel",
  "Strategie",
  "SQL",
  "Power BI",
  "Kommunikation",
  "Prozessmanagement",
];

export const roleOptions = [
  "Business Development",
  "Strategie",
  "Projektmanagement",
  "Data Analytics",
  "Product Management",
];

export const initialProfile: Profile = {
  education: "Master Wirtschaft & Management",
  experience: "Berufseinstieg",
  roles: ["Business Development", "Strategie", "Projektmanagement", "Data Analytics"],
  skills: ["Projektmanagement", "Data Analytics", "CRM", "Salesforce", "Excel"],
  workMode: "Hybrid",
  relocation: true,
  preferredRegions: [],
};

const jobs = (...items: Array<[string, string, WorkMode, number]>): DemoJob[] =>
  items.map(([title, company, mode, match]) => ({ title, company, mode, match }));

export const regions: Region[] = [
  {
    id: "munich", name: "München", state: "Bayern", x: 59, y: 79, longitude: 11.5761, latitude: 48.1371, baseJobs: 428,
    demand: 86, trend: 74, salary: 96, laborMarket: 86,
    skillDemand: { Strategie: 94, "Data Analytics": 91, Projektmanagement: 88, Excel: 75, Salesforce: 72, CRM: 76, SQL: 86, "Power BI": 82 },
    topSkills: ["Data Analytics", "Strategie", "Projektmanagement"],
    employers: ["Allianz", "BMW", "Siemens"],
    jobs: jobs(["Business Development Analyst", "Siemens", "Hybrid", 91], ["Strategy Associate", "Allianz", "Hybrid", 89], ["CRM Project Manager", "BMW", "Vor Ort", 86]),
  },
  {
    id: "frankfurt", name: "Frankfurt am Main", state: "Hessen", x: 39, y: 54, longitude: 8.6821, latitude: 50.1109, baseJobs: 356,
    demand: 89, trend: 79, salary: 94, laborMarket: 84,
    skillDemand: { Strategie: 92, "Data Analytics": 88, Projektmanagement: 86, Excel: 91, Salesforce: 74, CRM: 80, SQL: 81, "Power BI": 84 },
    topSkills: ["Strategie", "Excel", "Data Analytics"],
    employers: ["Deutsche Bank", "KfW", "Fraport"],
    jobs: jobs(["Junior Strategy Manager", "KfW", "Hybrid", 92], ["Business Analyst", "Fraport", "Hybrid", 88], ["Salesforce Consultant", "Deutsche Bank", "Remote", 83]),
  },
  {
    id: "hamburg", name: "Hamburg", state: "Hamburg", x: 43, y: 17, longitude: 9.9937, latitude: 53.5511, baseJobs: 338,
    demand: 84, trend: 86, salary: 86, laborMarket: 82,
    skillDemand: { Strategie: 85, "Data Analytics": 86, Projektmanagement: 90, Excel: 78, Salesforce: 77, CRM: 84, Kommunikation: 88, Prozessmanagement: 83 },
    topSkills: ["Projektmanagement", "Kommunikation", "Data Analytics"],
    employers: ["Otto Group", "Airbus", "Beiersdorf"],
    jobs: jobs(["Business Development Manager", "Otto Group", "Hybrid", 90], ["Project Management Associate", "Airbus", "Hybrid", 88], ["CRM Analyst", "Beiersdorf", "Vor Ort", 84]),
  },
  {
    id: "stuttgart", name: "Stuttgart", state: "Baden-Württemberg", x: 40, y: 76, longitude: 9.1829, latitude: 48.7758, baseJobs: 302,
    demand: 87, trend: 77, salary: 91, laborMarket: 88,
    skillDemand: { Strategie: 82, "Data Analytics": 87, Projektmanagement: 93, Excel: 78, Salesforce: 70, CRM: 79, Prozessmanagement: 92, "Power BI": 85 },
    topSkills: ["Projektmanagement", "Prozessmanagement", "Data Analytics"],
    employers: ["Mercedes-Benz", "Bosch", "Porsche"],
    jobs: jobs(["Digital Project Manager", "Bosch", "Hybrid", 91], ["Strategy & Operations Analyst", "Porsche", "Vor Ort", 87], ["CRM Specialist", "Mercedes-Benz", "Hybrid", 85]),
  },
  {
    id: "dusseldorf", name: "Düsseldorf", state: "Nordrhein-Westfalen", x: 20, y: 48, longitude: 6.7735, latitude: 51.2277, baseJobs: 294,
    demand: 83, trend: 81, salary: 87, laborMarket: 80,
    skillDemand: { Strategie: 90, "Data Analytics": 80, Projektmanagement: 87, Excel: 84, Salesforce: 81, CRM: 86, Kommunikation: 92, Prozessmanagement: 78 },
    topSkills: ["Kommunikation", "Strategie", "Projektmanagement"],
    employers: ["Henkel", "Vodafone", "METRO"],
    jobs: jobs(["Business Development Associate", "Vodafone", "Hybrid", 90], ["Commercial Strategy Analyst", "Henkel", "Hybrid", 87], ["Salesforce Product Owner", "METRO", "Remote", 84]),
  },
  {
    id: "cologne", name: "Köln", state: "Nordrhein-Westfalen", x: 21, y: 54, longitude: 6.9603, latitude: 50.9375, baseJobs: 276,
    demand: 80, trend: 83, salary: 82, laborMarket: 79,
    skillDemand: { Strategie: 82, "Data Analytics": 83, Projektmanagement: 88, Excel: 76, Salesforce: 84, CRM: 89, Kommunikation: 90, "Power BI": 75 },
    topSkills: ["Kommunikation", "CRM", "Projektmanagement"],
    employers: ["REWE Group", "RTL", "Lanxess"],
    jobs: jobs(["CRM Project Manager", "REWE Group", "Hybrid", 91], ["Business Insights Analyst", "RTL", "Hybrid", 86], ["Market Development Associate", "Lanxess", "Vor Ort", 83]),
  },
  {
    id: "berlin", name: "Berlin", state: "Berlin", x: 72, y: 36, longitude: 13.405, latitude: 52.52, baseJobs: 462,
    demand: 78, trend: 91, salary: 78, laborMarket: 70,
    skillDemand: { Strategie: 88, "Data Analytics": 90, Projektmanagement: 84, Excel: 68, Salesforce: 75, CRM: 78, SQL: 91, "Product Management": 94 },
    topSkills: ["Data Analytics", "SQL", "Strategie"],
    employers: ["Zalando", "HelloFresh", "Delivery Hero"],
    jobs: jobs(["Growth Strategy Analyst", "HelloFresh", "Hybrid", 89], ["Junior Product Manager", "Zalando", "Hybrid", 85], ["Business Intelligence Analyst", "Delivery Hero", "Remote", 87]),
  },
  {
    id: "hannover", name: "Hannover", state: "Niedersachsen", x: 40, y: 35, longitude: 9.732, latitude: 52.3759, baseJobs: 214,
    demand: 91, trend: 92, salary: 78, laborMarket: 85,
    skillDemand: { Strategie: 79, "Data Analytics": 86, Projektmanagement: 93, Excel: 84, Salesforce: 92, CRM: 95, SQL: 75, "Power BI": 81 },
    topSkills: ["CRM", "Projektmanagement", "Salesforce"],
    employers: ["Hannover Rück", "Continental", "TUI"],
    jobs: jobs(["CRM Business Analyst", "Hannover Rück", "Hybrid", 95], ["Salesforce Project Manager", "Continental", "Hybrid", 93], ["Business Development Analyst", "TUI", "Hybrid", 88]),
  },
  {
    id: "nuremberg", name: "Nürnberg / Erlangen", state: "Bayern", x: 55, y: 66, longitude: 11.04, latitude: 49.52, baseJobs: 187,
    demand: 94, trend: 95, salary: 84, laborMarket: 90,
    skillDemand: { Strategie: 80, "Data Analytics": 91, Projektmanagement: 91, Excel: 80, Salesforce: 73, CRM: 77, SQL: 86, Prozessmanagement: 90 },
    topSkills: ["Data Analytics", "Projektmanagement", "Prozessmanagement"],
    employers: ["Siemens Healthineers", "adidas", "Schaeffler"],
    jobs: jobs(["Strategic Development Analyst", "Siemens Healthineers", "Hybrid", 92], ["Process & Data Analyst", "Schaeffler", "Hybrid", 90], ["Junior Project Manager", "adidas", "Vor Ort", 86]),
  },
  {
    id: "leipzig", name: "Leipzig", state: "Sachsen", x: 65, y: 53, longitude: 12.3731, latitude: 51.3397, baseJobs: 171,
    demand: 82, trend: 94, salary: 68, laborMarket: 77,
    skillDemand: { Strategie: 76, "Data Analytics": 85, Projektmanagement: 86, Excel: 80, Salesforce: 69, CRM: 76, SQL: 84, Kommunikation: 82 },
    topSkills: ["Projektmanagement", "Data Analytics", "SQL"],
    employers: ["Porsche Leipzig", "DHL", "Amazon"],
    jobs: jobs(["Operations Project Analyst", "DHL", "Hybrid", 87], ["Business Analyst", "Porsche Leipzig", "Vor Ort", 85], ["Commercial Analyst", "Amazon", "Hybrid", 82]),
  },
  {
    id: "bremen", name: "Bremen", state: "Bremen", x: 31, y: 25, longitude: 8.8017, latitude: 53.0793, baseJobs: 128,
    demand: 76, trend: 82, salary: 72, laborMarket: 75,
    skillDemand: { Strategie: 70, "Data Analytics": 77, Projektmanagement: 89, Excel: 78, Salesforce: 63, CRM: 72, Prozessmanagement: 87, Kommunikation: 82 },
    topSkills: ["Projektmanagement", "Prozessmanagement", "Kommunikation"],
    employers: ["OHB", "BLG Logistics", "Mercedes-Benz"],
    jobs: jobs(["Project Controller", "OHB", "Hybrid", 84], ["Process Analyst", "BLG Logistics", "Vor Ort", 81], ["Junior Project Manager", "Mercedes-Benz", "Hybrid", 80]),
  },
  {
    id: "karlsruhe", name: "Karlsruhe", state: "Baden-Württemberg", x: 35, y: 70, longitude: 8.4037, latitude: 49.0069, baseJobs: 149,
    demand: 92, trend: 89, salary: 82, laborMarket: 89,
    skillDemand: { Strategie: 78, "Data Analytics": 94, Projektmanagement: 84, Excel: 74, Salesforce: 68, CRM: 71, SQL: 95, "Power BI": 88 },
    topSkills: ["SQL", "Data Analytics", "Power BI"],
    employers: ["EnBW", "dmTECH", "Atruvia"],
    jobs: jobs(["Data & Strategy Analyst", "Atruvia", "Hybrid", 90], ["Business Intelligence Analyst", "dmTECH", "Remote", 88], ["Digital Project Manager", "EnBW", "Hybrid", 84]),
  },
];
