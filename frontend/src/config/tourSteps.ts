import type { LucideIcon } from 'lucide-react'
import { getAccessiblePages } from './roles'
import type { User } from '@/types/api'

export interface TourStep {
  path: string
  label: string
  icon: LucideIcon
  detail: string
  sections?: TourSection[]
}

export interface TourSection {
  selector: string
  label: string
  detail: string
}

type Role = User['role']

const STEP_DETAILS: Record<string, string> = {
  '/': 'Your executive command screen. It shows the national Exposure at Loss (EAL), the Security Risk Index (SRI), live alerts, and the forecast trend — the headline numbers to present first.',
  '/security': 'The live command centre: incoming security events from real-time ingestion, event simulation, attack-chain paths, and the blast radius of an incident.',
  '/assets': 'Every asset in the national critical-finance inventory — name, sector, criticality, current risk and exposure. Click any asset to inspect its risk detail.',
  '/risk': 'The national risk deep-dive: sector-wise EAL, top risk drivers, compliance posture against CERT-In / RBI / NCIIPC frameworks, and the 12-month loss forecast.',
  '/vulnerabilities': 'The prioritised vulnerability catalogue with severity, exposure and mitigation status — ranked so the most costly risks are fixed first.',
  '/simulator': 'Run "what-if" scenarios (e.g. ransomware x banking). Watch the national EAL surge instantly, proving how sensitive the model is to each threat.',
  '/investment': 'The budget optimiser: spend a constrained defence budget across sectors and controls, then read the national EAL reduction and return on security investment (ROSI).',
  '/national': 'The nationwide observatory — sector and regional risk heatmaps across the Indian finance landscape with the pan-India summary exposure.',
  '/ai': 'The sovereign AI copilot: ask in plain language why risk rose, and receive explanations and mitigation recommendations grounded in observatory data.',
  '/settings': 'Profile, notification preferences and API configuration for the signed-in officer.',
}

const DASHBOARD_SECTIONS: TourSection[] = [
  {
    selector: 'risk-score',
    label: 'Enterprise Risk Score',
    detail: 'One 0–100 figure rating cyber-risk across the whole national critical-finance network. Higher means more dangerous — watch it fall as defences improve.',
  },
  {
    selector: 'eal',
    label: 'National Exposure at Loss (EAL)',
    detail: 'The rupee amount the nation could lose in a year from current cyber-risk. The arrow shows movement versus last month.',
  },
  {
    selector: 'budget',
    label: 'Defence Budget Used',
    detail: 'The total cyber-security budget for the financial year and how much is already allocated across the sector optimiser.',
  },
  {
    selector: 'kpi',
    label: 'Headline KPI Tiles',
    detail: 'Four instant warning gauges: twenty-four hour Value-at-Risk (worst plausible annual loss), open vulnerabilities, the do-nothing 12-month forecast, and total assets monitored.',
  },
  {
    selector: 'top-risk-drivers',
    label: 'Top Risk Drivers',
    detail: 'The biggest contributors pushing national risk up, with their live scores and severity, so the most dangerous forces are visible at a glance.',
  },
  {
    selector: 'vuln-distribution',
    label: 'Vulnerability Distribution',
    detail: 'A pie split of open vulnerabilities by category, so where the weakness sits is obvious without opening any lists.',
  },
  {
    selector: 'risk-trend',
    label: 'EAL & Risk Trend',
    detail: 'The 12-month trajectory of national exposure and risk score. A flat or falling line tells the judges that defences are working.',
  },
  {
    selector: 'impact-composition',
    label: 'Loss Impact Composition',
    detail: 'How the potential national loss is split across finance sectors — banking, markets, insurance, payments — in one stacked bar.',
  },
  {
    selector: 'data-quality',
    label: 'Data Quality',
    detail: 'The health of the data feeding the model. Green means clean, trustworthy inputs — the basis for trusting every score on this screen.',
  },
  {
    selector: 'loss-distribution',
    label: 'Loss Distribution (Monte-Carlo)',
    detail: 'A curve of all possible annual losses from thousands of simulations. The shaded tail shows the extreme, unlikely-but-possible, cases.',
  },
  {
    selector: 'compliance',
    label: 'Compliance Posture',
    detail: 'Which regulatory frameworks (CERT-In, RBI, NCIIPC, SEBI) impose requirements on the sector, and how many are currently satisfied.',
  },
  {
    selector: 'recent-events',
    label: 'Recent Events',
    detail: 'The latest security events flowing into the observatory in real time — this is the live activity feed.',
  },
  {
    selector: 'financial-exposure',
    label: 'Sector Financial Exposure',
    detail: 'Predicted financial exposure per sector in Rupees, so the most exposed part of the finance network is obvious.',
  },
  {
    selector: 'alerts-feed',
    label: 'Live Alerts',
    detail: 'Priority alerts raised automatically by the analysis engine — the items that need an officer\u2019s attention first.',
  },
  {
    selector: 'audit-chain',
    label: 'Audit Chain',
    detail: 'The tamper-evident audit trail behind every score and decision. This is what makes the platform trustworthy for a regulator.',
  },
]

const SECURITY_SECTIONS: TourSection[] = [
  {
    selector: 'severity-stats',
    label: 'Severity Command Cards',
    detail: 'The live tally of open vulnerabilities by criticality. Zero in on the Critical and High counts first, they drive national exposure.',
  },
  {
    selector: 'event-simulator',
    label: 'Event Simulator (Live Demo Loop)',
    detail: 'Inject a simulated vulnerability or remediation and watch the risk model react in real time, exactly as a live SOC demo would behave.',
  },
  {
    selector: 'attack-path',
    label: 'Crown-Jewel Attack Path',
    detail: 'The most likely chain an attacker would walk from an exposed asset to a crown-jewel system, with combined likelihood at each hop.',
  },
  {
    selector: 'blast-radius',
    label: 'Dependency Blast Radius',
    detail: 'If a selected asset is compromised, this shows every downstream system that would be pulled into the incident cost.',
  },
  {
    selector: 'recent-vulnerabilities',
    label: 'Recent Vulnerabilities',
    detail: 'The newest findings from the scanners, prioritised by severity, so the freshest risks are always on screen.',
  },
  {
    selector: 'severity-distribution',
    label: 'Severity Distribution',
    detail: 'A pie split of open vulnerabilities by category — where the weakness sits is obvious without opening any lists.',
  },
  {
    selector: 'control-coverage',
    label: 'Control Coverage',
    detail: 'Share of assets protected by implemented controls, per control type, with the reduction each control achieves.',
  },
]

const RISK_SECTIONS: TourSection[] = [
  {
    selector: 'risk-score-gauge',
    label: 'Enterprise Risk Gauge',
    detail: 'One 0-100 rating of cyber-risk across the national critical-finance network, shown as a live gauge dial.',
  },
  {
    selector: 'risk-breakdown',
    label: 'Risk Breakdown',
    detail: 'The top drivers pushing risk upward, each with its live score, so the most dangerous forces are visible at a glance.',
  },
  {
    selector: 'risk-matrix',
    label: 'Risk Matrix (Likelihood x Impact)',
    detail: 'Assets plotted on a likelihood-versus-impact heat grid. Anything in the top-right box needs attention today.',
  },
  {
    selector: 'risk-timeline',
    label: 'Risk Score Timeline',
    detail: 'The historical trajectory of the national risk score — a falling line proves defences are working.',
  },
  {
    selector: 'eal-forecast',
    label: 'EAL Forecast (12-month)',
    detail: 'A model projection of national exposure over the next year, do-nothing versus intervention scenarios.',
  },
  {
    selector: 'compliance-mapping',
    label: 'Compliance Control Mapping',
    detail: 'Which CERT-In, RBI, NCIIPC and SEBI requirements are satisfied and which still have control gaps.',
  },
  {
    selector: 'financial-exposure',
    label: 'Financial Exposure by Department',
    detail: 'Predicted loss per department in Rupees, so the most exposed parts of the network are obvious.',
  },
  {
    selector: 'data-sources',
    label: 'Ingestion Data Sources',
    detail: 'Every feed feeding the model — connectors, scanner, threat intel — with live connection status and event count.',
  },
  {
    selector: 'assets-by-eal',
    label: 'All Assets by EAL',
    detail: 'The full asset register ranked by expected annual loss. Click any row to open its detailed risk view.',
  },
]

const VULN_SECTIONS: TourSection[] = [
  {
    selector: 'vuln-header',
    label: 'Vulnerability Catalogue',
    detail: 'The prioritised list of every open vulnerability in the system, with the running total always in view.',
  },
  {
    selector: 'vuln-filters',
    label: 'Search + Severity Filters',
    detail: 'Search by CVE or title, then filter by severity and status to surface the findings a judge wants to see fastest.',
  },
  {
    selector: 'vuln-list',
    label: 'Prioritised Findings Table',
    detail: 'Every vulnerability with CVE, CVSS score, severity, status and affected asset — ranked so the costliest risks are fixed first.',
  },
]

const ASSET_SECTIONS: TourSection[] = [
  {
    selector: 'asset-header',
    label: 'Asset Inventory',
    detail: 'Every asset in the national critical-finance inventory, with the running total always on screen.',
  },
  {
    selector: 'asset-filters',
    label: 'Search + Type Filter',
    detail: 'Search by name and filter by asset type — server, database, application, network, cloud or endpoint.',
  },
  {
    selector: 'asset-table',
    label: 'Assets at a Glance',
    detail: 'Name, sector, criticality, current risk and exposure per asset. The whole national footprint in one table.',
  },
]

const NATIONAL_SECTIONS: TourSection[] = [
  {
    selector: 'national-tabs',
    label: 'Oversight / Regulatory Tabs',
    detail: 'Switch between the pure national-risk view and the regulatory assurance view for the sector regulators.',
  },
  {
    selector: 'national-summary',
    label: 'National Summary',
    detail: 'The pan-India exposure, national EAL and the top sector driving risk — the single most important card on this page.',
  },
  {
    selector: 'sector-risk',
    label: 'Sector Risk Exposure',
    detail: 'EAL split across banking, markets, insurance and payments, so the highest-risk sector stands out instantly.',
  },
  {
    selector: 'region-heatmap',
    label: 'Regional Exposure Heatmap',
    detail: 'Risk spread across Indian regions — dark cells mean greater national exposure in that geography.',
  },
  {
    selector: 'cyber-drill',
    label: 'National Cyber Exercise',
    detail: 'Run a live war-gaming drill (e.g. ransomware x banking) and watch the national EAL surge instantly.',
  },
  {
    selector: 'national-budget',
    label: 'National Budget Allocator',
    detail: 'Allocate the defence budget across sectors and read the projected EAL reduction from the optimiser.',
  },
]

const SIMULATOR_SECTIONS: TourSection[] = [
  {
    selector: 'current-state',
    label: '1 / Current State',
    detail: 'The pre-change baseline: enterprise risk score, expected annual loss and the current top risks.',
  },
  {
    selector: 'build-changes',
    label: '2 / Build Changes',
    detail: 'Add controls and remediations as if they already existed, then press Run Simulation to test the hypothesis.',
  },
  {
    selector: 'simulated-state',
    label: '3 / Simulated State',
    detail: 'The projected result of the changes — new risk score, new EAL and the per-asset delta, ready to apply as a plan.',
  },
]

const INVESTMENT_SECTIONS: TourSection[] = [
  {
    selector: 'investment-curve',
    label: 'Investment Curve',
    detail: 'The EAL-reduction-versus-budget curve: click any point to pick the defence budget you want to test.',
  },
  {
    selector: 'budget-config',
    label: 'Budget Configuration',
    detail: 'Type or slide the constrained budget, then press Optimize to compute the best sector allocation.',
  },
  {
    selector: 'available-controls',
    label: 'Available Security Controls',
    detail: 'Every control the optimiser can buy, with implementation cost, annual maintenance and risk-reduction impact.',
  },
]

const AI_SECTIONS: TourSection[] = [
  {
    selector: 'ai-header',
    label: 'Sovereign AI Copilot',
    detail: 'The plain-language assistant grounded in observatory data — ask why risk rose and get evidence-backed answers.',
  },
  {
    selector: 'chat-thread',
    label: 'Conversation',
    detail: 'Every answer arrives with confidence and the source data behind it, so recommendations stay auditable.',
  },
  {
    selector: 'chat-composer',
    label: 'Ask a Question',
    detail: 'Use the quick-action chips or type your own question and hit Send for a grounded explanation.',
  },
]

const SETTINGS_SECTIONS: TourSection[] = [
  {
    selector: 'settings-nav',
    label: 'Settings Sections',
    detail: 'Jump between Profile, Notification, API configuration and About from this sidebar.',
  },
  {
    selector: 'settings-profile',
    label: 'Your Profile',
    detail: 'The signed-in officer: name, email, username and role, with editable contact details.',
  },
]

const PAGE_SECTIONS: Record<string, TourSection[]> = {
  '/': DASHBOARD_SECTIONS,
  '/security': SECURITY_SECTIONS,
  '/risk': RISK_SECTIONS,
  '/vulnerabilities': VULN_SECTIONS,
  '/assets': ASSET_SECTIONS,
  '/national': NATIONAL_SECTIONS,
  '/simulator': SIMULATOR_SECTIONS,
  '/investment': INVESTMENT_SECTIONS,
  '/ai': AI_SECTIONS,
  '/settings': SETTINGS_SECTIONS,
}

export function getTourSteps(role?: Role | null): TourStep[] {
  const pages = getAccessiblePages(role ?? 'VIEWER')
  return pages
    .filter((p) => STEP_DETAILS[p.path])
    .map((p) => ({
      path: p.path,
      label: p.label,
      icon: p.icon,
      detail: STEP_DETAILS[p.path],
      sections: PAGE_SECTIONS[p.path] ?? [],
    }))
}