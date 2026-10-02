import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  DollarSign,
  FileCheck2,
  Gauge,
  GitBranch,
  Globe,
  GraduationCap,
  Landmark,
  Layers,
  LineChart,
  Lock,
  Network,
  Radar,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Target,
  Timer,
  TrendingDown,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { href: '#problem', label: 'The Problem' },
  { href: '#platform', label: 'Platform' },
  { href: '#engine', label: 'Quantification Engine' },
  { href: '#modules', label: 'Modules' },
  { href: '#evidence', label: 'Evidence' },
  { href: '#research', label: 'Research' },
]

const HERO_STATS = [
  { value: '\u20B96,520 Cr', label: 'National Expected Annual Loss' },
  { value: '0.70', label: 'Sovereign Risk Index' },
  { value: '+54%', label: 'Ransomware \u00D7 Banking surge' },
  { value: '10', label: 'Backend microservices' },
]

const PROBLEMS = [
  {
    problem: 'Cyber risk is measured annually, in spreadsheets.',
    detail: 'It goes stale the moment the spreadsheet is closed.',
    answer: 'Event-driven recalculation loop',
  },
  {
    problem: 'Findings are not money.',
    detail: 'A scanner says "CVSS 9.8". A board asks "how much?" Nobody can answer, so nobody funds the fix.',
    answer: 'Expected Annual Loss in \u20B9, four-way impact decomposition',
  },
  {
    problem: 'Security budgeting is not optimised.',
    detail: 'Budgets follow vendor relationships, legacy and anecdote \u2014 not risk reduction per rupee.',
    answer: 'OR-Tools CP-SAT 0/1 knapsack with ROSI',
  },
  {
    problem: 'Visibility is siloed.',
    detail: 'One dashboard per organisation. No shared picture across a Ministry, a regulator and a sectoral CERT.',
    answer: 'asset \u2192 agency \u2192 sector \u2192 region \u2192 nation roll-up',
  },
  {
    problem: 'Risk decisions are not auditable.',
    detail: '"Why did we accept this risk?" has no verifiable answer 18 months later.',
    answer: 'SHA-256 hash-linked chain with verify',
  },
  {
    problem: 'Third-party risk is invisible.',
    detail: 'A breach at a managed-service provider cascades into your crown jewels, but no tool attributes the loss.',
    answer: 'Vendor \u2192 asset \u2192 dependent cascade',
  },
  {
    problem: 'Compliance reporting is manual.',
    detail: 'Mapping control posture to RBI / SEBI / IRDAI / TRAI / NCIIPC / DPDP is a quarterly analyst exercise.',
    answer: '39 mandates \u00D7 8 control types \u00D7 10 frameworks',
  },
]

const PIPELINE = [
  {
    step: '01',
    icon: Radar,
    title: 'Ingest',
    detail:
      'Five connectors (SIEM, EDR, IAM, CSPM, NIDS) publish findings to Redis. Vulnerabilities are enriched against CISA KEV, FIRST EPSS and the NVD through a three-tier cache.',
  },
  {
    step: '02',
    icon: Gauge,
    title: 'Quantify',
    detail:
      'CVSS becomes an exploitation probability, damped by control effectiveness, expanded into a four-way impact decomposition, and multiplied into a monetary Expected Annual Loss.',
  },
  {
    step: '03',
    icon: Layers,
    title: 'Aggregate',
    detail:
      'Per-asset loss rolls up through agencies, sectors and regions into the national Sovereign Risk Index, with a data-confidence score attached to every figure.',
  },
  {
    step: '04',
    icon: Target,
    title: 'Optimise',
    detail:
      'A CP-SAT solver decides which controls to buy under a fixed budget, producing an optimal allocation and a Return on Security Investment figure.',
  },
  {
    step: '05',
    icon: Scale,
    title: 'Govern',
    detail:
      'Every decision is written to a tamper-evident hash chain, mapped to regulatory mandates, and exportable as a regulator-ready report.',
  },
]

const ENGINE_STEPS = [
  {
    title: 'CVSS \u2192 exploitation probability',
    body: 'A piecewise-linear anchor table maps a CVSS base score to an intrinsic probability of compromise. Honest limitation: this is a calibration placeholder, not a measurement from an institution\u2019s own loss history.',
  },
  {
    title: 'Control reduction',
    body: 'Control effectiveness is applied through a Wagner-style independence model rather than naive multiplication, so overlapping controls do not double-count their reduction.',
  },
  {
    title: 'Four-way impact decomposition',
    body: 'Single Point of Impact is split into confidentiality, integrity, availability and regulatory components. A unit test asserts the parts always sum back to the declared total.',
  },
  {
    title: 'Risk score (0\u2013100)',
    body: 'A weighted composition of exploitability, impact and exposure, banded into Low / Medium / High / Critical. Band boundaries are unit-tested against the arithmetic in the source.',
  },
  {
    title: 'Expected Annual Loss in \u20B9',
    body: 'Probability multiplied by Single Point of Impact yields a rupee figure. This is the step that makes the output legible to a Finance Ministry instead of only a CISO.',
  },
  {
    title: 'Monte-Carlo loss distribution',
    body: 'A FAIR-style compound frequency \u00D7 severity simulation produces a loss curve with percentile bands (conservative, expected, adverse, severe), so tail risk is visible rather than masked by a single point estimate.',
  },
]

const MODULES = [
  {
    icon: Gauge,
    name: 'Executive Dashboard',
    role: 'VIEWER',
    detail:
      'The national picture on one screen: EAL, Sovereign Risk Index, sector and region heatmaps, trend history and live risk events over a WebSocket.',
  },
  {
    icon: Shield,
    name: 'Security Posture',
    role: 'ANALYST',
    detail:
      'Control inventory with effectiveness dampened by real incident history, plus coverage gaps surfaced with explicit data-quality strings.',
  },
  {
    icon: Server,
    name: 'Asset Inventory',
    role: 'ANALYST',
    detail:
      'Business value, criticality, internet exposure and the dependency graph that drives blast-radius propagation. Every asset carries the rupee value that anchors its EAL.',
  },
  {
    icon: AlertTriangle,
    name: 'Vulnerability Management',
    role: 'ANALYST',
    detail:
      'CVSS severity enriched with KEV known-exploitation flags and EPSS probability. Priority is recomputed from exploitability, not raw severity alone.',
  },
  {
    icon: LineChart,
    name: 'Risk Analysis',
    role: 'VIEWER',
    detail:
      'EAL, VaR bands, drivers of risk and impact decomposition, with both a gradient-boosting forecast and a deterministic do-nothing baseline for comparison.',
  },
  {
    icon: Target,
    name: 'Scenario Simulator',
    role: 'ANALYST',
    detail:
      'Worm, ransomware, supply-chain and DDoS templates run against the real asset graph, including detection-delay escalation modelling.',
  },
  {
    icon: DollarSign,
    name: 'Investment Optimiser',
    role: 'CISO',
    detail:
      'CP-SAT 0/1 knapsack under a budget cap, returning an optimal control allocation, residual EAL and ROSI, with a density-greedy fallback.',
  },
  {
    icon: Landmark,
    name: 'National Observatory',
    role: 'CISO',
    detail:
      'Sovereign Risk Index, sector compliance posture, national cyber exercises, third-party vendor cascades and a regulator-ready report.',
  },
  {
    icon: Bot,
    name: 'AI Assistant',
    role: 'ANALYST',
    detail:
      'Retrieval-augmented answers over a compliance corpus with citations, plus plain-language explanation of any figure in the platform.',
  },
]

const PERSONAS = [
  {
    icon: Building2,
    who: 'Ministry / CERT-In',
    login: 'scro_regulator',
    need: 'National EAL, the Sovereign Risk Index, sector and region heatmaps, running national exercises and allocating the national security budget.',
  },
  {
    icon: Wallet,
    who: 'Banking-sector analyst',
    login: 'scro_banker',
    need: 'Asset inventory, the vulnerability backlog, risk drill-down and scenario simulation for a specific institution.',
  },
  {
    icon: FileCheck2,
    who: 'National auditor',
    login: 'scro_auditor',
    need: 'Review the reported risk and independently verify that the SHA-256 audit chain has not been tampered with.',
  },
]

const EVIDENCE = [
  { value: '\u20B96,520 Cr', label: 'National EAL', note: 'Seeded reference estate, reported in the national summary.' },
  { value: '0.70', label: 'Sovereign Risk Index', note: 'Composite national score with a confidence grade.' },
  { value: '+54%', label: 'Ransomware \u00D7 Banking', note: '\u20B94,838 Cr \u2192 \u20B97,430 Cr under the drill template.' },
  { value: '\u221267.5%', label: 'EAL reduction', note: '\u20B95 Cr budget \u2192 \u20B91.54 Cr allocated across 3 sectors, 22 controls.' },
  { value: '\u20B915,863 Cr', label: 'Vendor cascade', note: 'Third-party exposure attributed across 4 directly dependent assets.' },
  { value: 'INTACT', label: 'Audit chain', note: 'Hash-linked verification result on every recorded decision.' },
]

const STACK = [
  { layer: 'Frontend', items: 'React 18.3 \u00B7 TypeScript 5.3 \u00B7 Vite 5 \u00B7 Tailwind 3.4 \u00B7 ECharts 6 \u00B7 Zustand \u00B7 React Router 6' },
  { layer: 'API', items: 'FastAPI 0.115 (pinned) \u00B7 Starlette \u00B7 Pydantic 2.9 \u00B7 uvicorn 0.30 with websockets support' },
  { layer: 'Gateway', items: 'JWT verification \u00B7 Redis-backed rate limiting \u00B7 circuit breaker \u00B7 Prometheus metrics \u00B7 security headers' },
  { layer: 'Data', items: 'PostgreSQL 16+ with pgvector \u00B7 SQLAlchemy 2.0 \u00B7 8 schemas \u00B7 26 tables \u00B7 partial + composite indexes' },
  { layer: 'Cache & bus', items: 'Redis \u2014 pub/sub, rate limits, connector state, circuit-breaker state, replay jobs' },
  { layer: 'Auth', items: 'PyJWT HS256 \u00B7 bcrypt with per-password salt \u00B7 4-tier RBAC \u00B7 registration disabled by default' },
  { layer: 'Analytics', items: 'XGBoost \u00B7 scikit-learn \u00B7 numpy / pandas / scipy \u00B7 declines to forecast below 18 samples and says why' },
  { layer: 'Optimisation', items: 'Google OR-Tools CP-SAT with OPTIMAL / FEASIBLE semantics and a density-greedy fallback' },
  { layer: 'AI', items: 'Retrieval-augmented generation over a compliance corpus \u00B7 deterministic offline mode so demos cost nothing' },
  { layer: 'Realtime', items: 'Native WebSocket with hand-rolled STOMP 1.2 framing and heartbeat' },
]

const DEPLOY = [
  {
    icon: Database,
    name: 'Neon PostgreSQL',
    detail:
      'Serverless Postgres with pgvector. 8 schemas, 26 tables, seeded with a representative banking estate: 12 assets, 15 vulnerabilities, 10 controls, 18 dependency edges, 25 risk snapshots.',
  },
  {
    icon: Cloud,
    name: 'Render Free (backend)',
    detail:
      'All ten services plus a pure-Python edge proxy run in a single process at roughly 250 MB, which is what makes the free 512 MB tier viable. Migrations and seeding run on every boot.',
  },
  {
    icon: Globe,
    name: 'Vercel (frontend)',
    detail:
      'Static SPA with a rewrite to index.html. Two build-time variables point the client at the gateway and the WebSocket endpoint.',
  },
  {
    icon: Lock,
    name: 'Zero external SaaS',
    detail:
      'No per-seat security licence, no foreign cloud dependency, no LLM API key required. The platform runs entirely on open-source components and your own database.',
  },
]

const ASSURANCE = [
  { value: '119', label: 'Backend tests', note: '17 dedicated formula tests, CP-SAT optimality counterexample, audit-chain hashing, STOMP framing.' },
  { value: '51', label: 'Frontend tests', note: 'Vitest + Testing Library across the API client, WebSocket backoff, roles, severity and exports.' },
  { value: '3', label: 'CI workflows', note: 'Build + test on push, weekly pip-audit and npm audit, Dependabot.' },
  { value: '0', label: 'External AI cost', note: 'Deterministic offline LLM and embedder, so a proof of concept runs at zero marginal cost.' },
]

const HONESTY = [
  {
    icon: TrendingDown,
    title: 'Calibration is the real gap',
    body: 'The probability layer is a piecewise-linear CVSS lookup table with hand-picked anchors. A regulator will rightly ask where those numbers came from. Calibrating to an institution\u2019s own incident history is the single highest-value next step, and EPSS is the natural empirical replacement.',
  },
  {
    icon: GitBranch,
    title: 'Validated at reference scale',
    body: 'Built and proven at 12 assets and 15 vulnerabilities. The scenario path is O(N\u00B2) because impact is recomputed per asset inside the loop, so it will not survive thousands of assets without caching.',
  },
  {
    icon: Timer,
    title: 'No scheduler yet',
    body: 'Snapshots are created on demand or by event traffic. There is no cron, so the "continuous" claim currently depends on events arriving rather than on a clock.',
  },
  {
    icon: Users,
    title: 'Simulated federation, not multi-tenancy',
    body: 'Inter-agency scoping is modelled with a parent-agency hierarchy and documented as a later phase. Two institutions on one instance would leak across tenants, which is why per-institution deployment is the intended model.',
  },
  {
    icon: Scale,
    title: 'EAL sums linearly',
    body: 'Aggregating per-vulnerability EAL assumes independent events with constant impact. A correlated ransomware event across six assets is one event, not six. Monte-Carlo compounding exists but is currently per-asset.',
  },
  {
    icon: GraduationCap,
    title: 'Forecasts rest on synthetic history',
    body: 'The 25 snapshots are generated by a deterministic growth formula and are global rather than per-asset, so the model is learning a trend, not risk dynamics. Treat the forecast as a mechanism demo until real history exists.',
  },
]

const RESEARCH = [
  {
    tag: 'FAIR',
    cite: 'Jones, D. (2013). A FAIR Approach to Cybersecurity Risk. ISC2 Journal, 4(1).',
    why: 'Frequency \u00D7 Vulnerability \u00D7 Impact \u2014 the probability \u00D7 impact structure the whole engine is built on.',
  },
  {
    tag: 'Compound loss',
    cite: 'Bohmer, E., G\u00FCr, S., Sutter, T., & Tellenbach, C. (2010). Estimating the Loss Distribution of Cyber Incidents. SICS / ACM.',
    why: 'Models cyber loss as a compound frequency \u00D7 severity distribution \u2014 the standard citation for the lognormal-severity Monte-Carlo simulation.',
  },
  {
    tag: 'Attack graphs',
    cite: 'Ammann, S., Wijesekera, D., & Kaushik, S. (2002). Scalable, Graph-Based Network Vulnerability Analysis. IEEE S&P.',
    why: 'Dependency-ordered graph generation: the basis for blast-radius propagation and attack-path discovery.',
  },
  {
    tag: 'Quantification on graphs',
    cite: 'Noel, S., & Jajodia, S. (2004). Measuring Security Risk of Networks Using Attack Graphs. IEEE Computer, 37(12).',
    why: 'Aggregates per-node risk into network risk \u2014 exactly what the national roll-up does at sovereign scale.',
  },
  {
    tag: 'Severity',
    cite: 'NIST SP 800-40 Rev. 3 / FIRST. Common Vulnerability Scoring System v3.1; Exploit Prediction Scoring System.',
    why: 'The normative CVSS scale, plus the empirical exploitability signal that replaces hand-tuned probability tables.',
  },
  {
    tag: 'Frameworks',
    cite: 'NIST (2024). Cybersecurity Framework 2.0 (CSWP 29); ISO/IEC 27001:2022; CIS Critical Security Controls v8.',
    why: 'The control and subcategory identifiers the compliance mapper cites directly.',
  },
  {
    tag: 'Optimisation',
    cite: 'Dantzig, G. B. (1957). Discrete-Variable Extremum Problems. Operations Research, 5(1).',
    why: 'The original 0/1 knapsack formulation behind the CP-SAT control allocator.',
  },
  {
    tag: 'Security ROI',
    cite: 'Davis, J. J. (2007). Measuring the Efficiency of Cybersecurity Risk Management. CACM, 50(4).',
    why: 'The canonical treatment of whether a security programme is economically efficient \u2014 the theoretical parent of ROSI.',
  },
  {
    tag: 'Diminishing returns',
    cite: 'Hubbard, D. W. (2016). The Failure of Risk Management (2nd ed.).',
    why: 'Reducing exposure below a point of diminishing returns is irrational \u2014 the insight the budget optimiser implements.',
  },
  {
    tag: 'Machine learning',
    cite: 'Chen, T., & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. ACM KDD \u201916.',
    why: 'The mandatory citation for the gradient-boosting forecast, and for the regularised shallow-tree configuration used.',
  },
  {
    tag: 'Forecast validity',
    cite: 'Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice (3rd ed.). OTexts.',
    why: 'Authoritative on minimum sample sizes and out-of-sample testing \u2014 the standard against which the synthetic 25-point history must be judged.',
  },
  {
    tag: 'Retrieval',
    cite: 'Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS 33.',
    why: 'The mandatory RAG citation; Sentence-BERT is the standard upgrade path from deterministic hashing.',
  },
  {
    tag: 'Digital twins',
    cite: 'Grieves, M. (2014). The Digital Twin. Springer; Tao, F., et al. (2019). Digital Twin in Industry. IEEE TII, 15(4).',
    why: 'The framing behind the observatory. Fuller et al. (2020) is the honest counterweight when claiming "twin".',
  },
  {
    tag: 'Cyber ranges',
    cite: 'Kounev, S. (2007/2011). Cyber-Range Modeling and Analysis. CMU/SEI-2011-TR-002.',
    why: 'The foundational reference for construct / abstract / exercise hierarchies behind national cyber exercises.',
  },
  {
    tag: 'Regulation',
    cite: 'CERT-In Directions, 28 April 2022; RBI Master Direction (DPSS.CO.PD No. 106/02.01.014/2022-23); DPDP Act 2023 \u00A79.',
    why: 'The actual obligations this platform is built to answer: 6/24/72-hour reporting, 180-day retention, board-approved IT strategy and data-fiduciary safeguards.',
  },
]

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  tone = 'app',
}: {
  id?: string
  eyebrow: string
  title: string
  lead?: string
  children: React.ReactNode
  tone?: 'app' | 'surface'
}) {
  return (
    <section id={id} className={tone === 'surface' ? 'bg-bg-surface' : 'bg-bg-app'}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[30px]">
          {title}
        </h2>
        {lead && (
          <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-text-secondary">{lead}</p>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuthStore()

  useEffect(() => {
    if (window.location.hash) return
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border-default bg-bg-app/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-900 text-white">
              <Landmark className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-text-primary">
                Sovereign Cyber-Risk Observatory
              </p>
              <p className="hidden text-[9px] font-medium uppercase tracking-[0.18em] text-text-tertiary sm:block">
                CyberRisk Quantifier
              </p>
            </div>
          </div>

          <nav className="ml-auto hidden items-center gap-6 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              isAuthenticated ? navigate('/', { replace: true }) : navigate('/login')
            }
            className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-accent-primary px-3.5 text-[12px] font-semibold text-white transition-all hover:brightness-110 active:brightness-95 disabled:opacity-60 lg:ml-0"
          >
            {isAuthenticated ? 'Dashboard' : 'Enter Observatory'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(900px 380px at 15% -10%, rgba(64,104,159,0.55), transparent 60%), radial-gradient(700px 320px at 100% 0%, rgba(27,58,107,0.5), transparent 65%)',
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-live" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
              AI-Powered Continuous Cyber Risk Quantification
            </span>
          </div>

          <h1 className="mt-6 max-w-4xl text-[32px] font-semibold leading-[1.12] tracking-tight sm:text-[44px]">
            Every technical finding, expressed as money.
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-white/65">
            A national digital twin that converts vulnerability and control telemetry into a
            monetary Expected Annual Loss, rolls that loss from a single asset all the way up to
            the nation, and then decides which security controls to buy with a given budget.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                isAuthenticated ? navigate('/', { replace: true }) : navigate('/login')
              }
              className="flex h-11 items-center gap-2 rounded-[6px] bg-white px-5 text-[13px] font-semibold text-brand-950 transition-all hover:bg-white/90 active:bg-white/80 disabled:opacity-60"
            >
              {isAuthenticated ? 'Return to Dashboard' : 'Enter the Observatory'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#platform"
              className="flex h-11 items-center gap-2 rounded-[6px] border border-white/20 px-5 text-[13px] font-semibold text-white/85 transition-all hover:border-white/40 hover:bg-white/[0.06]"
            >
              See how it works
            </a>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06] lg:grid-cols-4">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="bg-brand-950/85 px-4 py-5">
                <dd className="text-[20px] font-semibold tracking-tight text-white sm:text-[22px]">
                  {s.value}
                </dd>
                <dt className="mt-1.5 text-[10px] font-medium uppercase leading-relaxed tracking-[0.1em] text-white/45">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The problem */}
      <Section
        id="problem"
        eyebrow="The Problem"
        title="Seven reasons cyber risk never reaches the budget line"
        lead="Risk registers fail for the same structural reason every time: they terminate in adjectives instead of amounts. Each row below pairs a real failure with the specific mechanism in this platform that answers it."
      >
        <div className="overflow-hidden rounded-[12px] border border-border-default">
          {PROBLEMS.map((p, i) => (
            <div
              key={p.problem}
              className={`grid gap-3 p-5 sm:grid-cols-[1.1fr_1.4fr_1fr] sm:gap-6 ${
                i % 2 === 1 ? 'bg-bg-surface' : 'bg-bg-app'
              } ${i !== PROBLEMS.length - 1 ? 'border-b border-border-subtle' : ''}`}
            >
              <p className="text-[13px] font-semibold leading-snug text-text-primary">{p.problem}</p>
              <p className="text-[12px] leading-relaxed text-text-secondary">{p.detail}</p>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-status-low" />
                <p className="text-[12px] font-medium leading-relaxed text-text-primary">
                  {p.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Platform */}
      <Section
        id="platform"
        tone="surface"
        eyebrow="The Platform"
        title="A five-stage pipeline from raw telemetry to an audited spending decision"
        lead="Every stage is a separate bounded service behind a single gateway. Nothing is simulated between the database and the dashboard \u2014 an event published to the bus genuinely mutates a row and pushes a recalculated figure to the browser."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((p) => (
            <div
              key={p.step}
              className="rounded-[12px] border border-border-default bg-bg-app p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-bg-elevated text-accent-primary">
                  <p.icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                  {p.step}
                </span>
              </div>
              <p className="mt-4 text-[14px] font-semibold text-text-primary">{p.title}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{p.detail}</p>
            </div>
          ))}
        </div>

        {/* Architecture */}
        <div className="mt-8 rounded-[12px] border border-border-default bg-bg-app p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            System architecture
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1fr)] lg:items-center">
            <div className="rounded-[10px] border border-border-default bg-bg-surface p-4">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
                <Globe className="h-3.5 w-3.5 text-accent-primary" /> Browser
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                React SPA. REST for queries, STOMP over WebSocket for live risk events.
              </p>
            </div>

            <div className="hidden justify-center text-text-tertiary lg:flex">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="rounded-[10px] border border-accent-primary/40 bg-accent-primary/[0.06] p-4">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" /> API Gateway
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                The only public ingress. Verifies JWT, rate-limits, trips a circuit breaker,
                attaches Prometheus metrics and security headers.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['auth', 'asset', 'vuln', 'control', 'ingest', 'risk', 'invest', 'ai'].map((s) => (
                  <span
                    key={s}
                    className="rounded border border-border-default bg-bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
                  >
                    {s}
                  </span>
                ))}
                <span className="rounded border border-border-default bg-bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  notify
                </span>
              </div>
            </div>

            <div className="hidden justify-center text-text-tertiary lg:flex">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="space-y-3">
              <div className="rounded-[10px] border border-border-default bg-bg-surface p-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
                  <Database className="h-3.5 w-3.5 text-accent-primary" /> PostgreSQL
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                  8 schemas, 26 tables, partial and composite indexes on the hot paths.
                </p>
              </div>
              <div className="rounded-[10px] border border-border-default bg-bg-surface p-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
                  <Network className="h-3.5 w-3.5 text-accent-primary" /> Redis
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">
                  Event bus, rate-limit counters, circuit-breaker state, replay jobs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Engine */}
      <Section
        id="engine"
        eyebrow="Quantification Engine"
        title="The mathematics is the product"
        lead="Six stages convert a severity score into a defensible annual loss figure. Each is single-sourced in one place and covered by unit tests that assert the arithmetic, including inline worked values, so a reviewer can verify the model rather than trust it."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ENGINE_STEPS.map((s, i) => (
            <div key={s.title} className="rounded-[12px] border border-border-default bg-bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-primary/12 font-mono text-[10px] font-bold text-accent-primary">
                  {i + 1}
                </span>
                <p className="text-[13px] font-semibold leading-snug text-text-primary">{s.title}</p>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Cpu,
              title: 'Provably optimal, not greedy',
              body: 'The allocator is a real CP-SAT 0/1 knapsack. A dedicated test constructs a case where density-greedy picks the wrong set, and the solver still finds the global optimum.',
            },
            {
              icon: Zap,
              title: 'Degradation is designed',
              body: 'XGBoost falls back to a deterministic forecast, CP-SAT falls back to greedy, the LLM falls back to an offline mock, and threat feeds fall back to cache then offline.',
            },
            {
              icon: Target,
              title: 'Uncertainty is stated',
              body: 'A five-component data-confidence score ships with every figure, and Monte-Carlo percentile bands make severe tail outcomes visible instead of hiding behind a point estimate.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-[12px] border border-border-default bg-bg-surface p-5">
              <c.icon className="h-4 w-4 text-accent-primary" strokeWidth={1.75} />
              <p className="mt-3 text-[13px] font-semibold text-text-primary">{c.title}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Modules */}
      <Section
        id="modules"
        tone="surface"
        eyebrow="Modules"
        title="Nine working surfaces, gated by role"
        lead="Each module maps to a real route in the application and is protected by a four-tier role hierarchy. What follows is what each one actually does."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.name}
              className="flex flex-col rounded-[12px] border border-border-default bg-bg-app p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-accent-primary">
                  <m.icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <span className="rounded border border-border-default bg-bg-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {m.role}
                </span>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-text-primary">{m.name}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{m.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Personas */}
      <Section
        eyebrow="Who it serves"
        title="Three roles, three seeded demo accounts"
        lead="Public registration is disabled by default and migration deactivates any privileged account, so exactly these three personas can authenticate. One-click demo login is available on the sign-in screen."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <div key={p.login} className="rounded-[12px] border border-border-default bg-bg-surface p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-bg-elevated text-accent-primary">
                <p.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-text-primary">{p.who}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{p.need}</p>
              <p className="mt-4 rounded-md border border-border-subtle bg-bg-input px-2.5 py-1.5 font-mono text-[11px] text-text-secondary">
                {p.login}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Evidence */}
      <Section
        id="evidence"
        tone="surface"
        eyebrow="Evidence"
        title="What the reference estate actually produces"
        lead="These figures come from running the platform against its seeded banking estate, not from projections. They are the numbers the application returns when a regulator account opens the National Observatory."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVIDENCE.map((e) => (
            <div key={e.label} className="rounded-[12px] border border-border-default bg-bg-app p-5">
              <p className="text-[24px] font-semibold tracking-tight text-text-primary">{e.value}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-accent-primary">{e.label}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">{e.note}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-[10px] border border-status-medium/30 bg-status-medium/[0.08] p-4 text-[12px] leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">Read these as a mechanism demo.</span>{' '}
          The ROSI figure is an artifact of the seeded scale, where control costs are measured in
          lakhs and EAL deltas in crores. A defensible production ROSI is typically in the
          200&ndash;900% range. The value here is that the calculation is real and reproducible, not
          that the magnitude would survive real inputs.
        </p>
      </Section>

      {/* Stack & deployment */}
      <Section
        eyebrow="Engineering"
        title="Built entirely on components you can audit and run yourself"
        lead="No proprietary licence, no per-seat tax, no foreign cloud dependency and no LLM API key required. The entire platform runs on open-source software and a database you control."
      >
        <div className="overflow-hidden rounded-[12px] border border-border-default">
          {STACK.map((s, i) => (
            <div
              key={s.layer}
              className={`grid gap-2 p-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 ${
                i % 2 === 1 ? 'bg-bg-surface' : 'bg-bg-app'
              } ${i !== STACK.length - 1 ? 'border-b border-border-subtle' : ''}`}
            >
              <p className="text-[12px] font-semibold text-text-primary">{s.layer}</p>
              <p className="text-[12px] leading-relaxed text-text-secondary">{s.items}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEPLOY.map((d) => (
            <div key={d.name} className="rounded-[12px] border border-border-default bg-bg-surface p-5">
              <d.icon className="h-4 w-4 text-accent-primary" strokeWidth={1.75} />
              <p className="mt-3 text-[13px] font-semibold text-text-primary">{d.name}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{d.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ASSURANCE.map((a) => (
            <div key={a.label} className="rounded-[12px] border border-border-default bg-bg-surface p-5">
              <p className="text-[22px] font-semibold tracking-tight text-text-primary">{a.value}</p>
              <p className="mt-1 text-[12px] font-semibold text-accent-primary">{a.label}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">{a.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Limitations */}
      <Section
        tone="surface"
        eyebrow="Honest assessment"
        title="What this platform cannot yet do"
        lead="A risk engine that hides its own weaknesses is not usable for oversight. These are the real current limitations, stated plainly, with the specific fix for each."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {HONESTY.map((h) => (
            <div key={h.title} className="rounded-[12px] border border-border-default bg-bg-app p-5">
              <h.icon className="h-4 w-4 text-status-high" strokeWidth={1.75} />
              <p className="mt-3 text-[13px] font-semibold leading-snug text-text-primary">{h.title}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{h.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[12px] border border-border-default bg-bg-app p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Feasibility and viability, in brief
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-[12px] font-semibold text-text-primary">Technically feasible</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                Demonstrated. The event loop is genuinely wired, the mathematics is unit-tested,
                the optimiser is provably optimal, and degradation paths are deliberate rather than
                accidental. It has been run end to end against live infrastructure.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text-primary">
                Institutionally wanted
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                The platform indexes the instruments institutions are actually audited against,
                including CERT-In reporting timelines, the RBI master direction and DPDP
                Section 9(5). The buyer is identifiable and singular, which is procurement-friendly.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text-primary">Commercially narrow</p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                The realistic path is project and foundation revenue rather than SaaS. The moat is
                not the code, it is the calibration data and regulatory trust accumulated in the
                first engagement.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Research */}
      <Section
        id="research"
        eyebrow="Research foundations"
        title="Grounded in published work, not invented method"
        lead="Every major design decision traces to a citable source. Where this platform deliberately diverges from a standard, the divergence is named rather than hidden."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {RESEARCH.map((r) => (
            <div
              key={r.tag}
              className="rounded-[10px] border border-border-default bg-bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-accent-primary/30 bg-accent-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-primary">
                  {r.tag}
                </span>
              </div>
              <p className="mt-2.5 text-[12px] font-medium leading-relaxed text-text-primary">
                {r.cite}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-tertiary">{r.why}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-border-default bg-bg-surface p-4 text-[12px] leading-relaxed text-text-secondary">
          <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-primary" />
          <span>
            Note on ISO/IEC 27005: this platform follows a FAIR-shaped quantitative method rather
            the ISO 27005 risk-management methodology. That is a deliberate, defensible divergence
            worth stating explicitly rather than glossing over. Verification of each citation
            against its source is recommended before academic submission.
          </span>
        </p>
      </Section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-8 lg:py-20">
          <h2 className="mx-auto max-w-2xl text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">
            See the numbers for yourself
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-white/60">
            Three seeded accounts, one click to sign in. No signup, no configuration, no external
            dependency.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              isAuthenticated ? navigate('/', { replace: true }) : navigate('/login')
            }
            className="mx-auto mt-8 flex h-11 items-center gap-2 rounded-[6px] bg-white px-6 text-[13px] font-semibold text-brand-950 transition-all hover:bg-white/90 active:bg-white/80 disabled:opacity-60"
          >
            {isAuthenticated ? 'Return to Dashboard' : 'Enter the Observatory'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> CERT-In aligned
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="h-3 w-3" /> RBI / SEBI / IRDAI mapped
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> 100% open source
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Continuously recalculated
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-default bg-bg-app">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[11px] text-text-tertiary sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Sovereign Cyber-Risk Observatory &middot; National Financial-Security Programme</p>
          <div className="flex items-center gap-4">
            <a href="#platform" className="transition-colors hover:text-text-secondary">
              Platform
            </a>
            <a href="#research" className="transition-colors hover:text-text-secondary">
              Research
            </a>
            <Link to="/login" className="transition-colors hover:text-text-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}