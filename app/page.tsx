"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Check, ChevronRight, MapPin, RotateCcw, SlidersHorizontal, TrendingUp } from "lucide-react";
import { OpportunityMap } from "@/components/opportunity-map";
import { CinematicIntro } from "@/components/cinematic-intro";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { initialProfile, regions, roleOptions, skillOptions, type Profile, type WorkMode } from "@/lib/market-data";
import { scoreAllRegions, type ScoredRegion } from "@/lib/scoring";

type SortKey = "score" | "jobs" | "trend";

function scoreColor(score: number) {
  if (score >= 88) return "#075441";
  if (score >= 83) return "#22765D";
  if (score >= 78) return "#72A995";
  return "#C7D8D1";
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function ProfileControls({ profile, onChange, onSave, saveStatus, testSetup = false }: { profile: Profile; onChange: (next: Profile) => void; onSave: () => void; saveStatus: SaveStatus; testSetup?: boolean }) {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const toggleListValue = (key: "roles" | "skills", value: string) => {
    const current = profile[key];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onChange({ ...profile, [key]: next });
  };
  const visibleSkills = showAllSkills ? skillOptions : skillOptions.slice(0, 5);

  return (
    <div className="profile-controls">
      <div className="panel-heading">
        <div><p className="eyebrow">Dein Profil</p><h2>Was bringst du mit?</h2></div>
        <SlidersHorizontal aria-hidden="true" />
      </div>
      <div className="field-group">
        <label>Abschluss</label>
        <Select value={profile.education} onValueChange={(education) => onChange({ ...profile, education })}>
          <SelectTrigger className="control"><SelectValue>{profile.education}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="Master Wirtschaft & Management">Master Wirtschaft & Management</SelectItem>
            <SelectItem value="Bachelor Wirtschaft">Bachelor Wirtschaft</SelectItem>
            <SelectItem value="Kaufmännische Ausbildung">Kaufmännische Ausbildung</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="field-group">
        <label>Erfahrungslevel</label>
        <Select value={profile.experience} onValueChange={(experience) => onChange({ ...profile, experience })}>
          <SelectTrigger className="control"><SelectValue>{profile.experience}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="Berufseinstieg">Berufseinstieg</SelectItem>
            <SelectItem value="1–3 Jahre Erfahrung">1–3 Jahre Erfahrung</SelectItem>
            <SelectItem value="3–5 Jahre Erfahrung">3–5 Jahre Erfahrung</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <fieldset className="field-group">
        <legend>Tätigkeitsfelder</legend>
        <div className="check-list">
          {roleOptions.map((role) => (
            <label className="check-row" key={role}>
              <Checkbox checked={profile.roles.includes(role)} onCheckedChange={() => toggleListValue("roles", role)} />
              <span>{role}</span>
            </label>
          ))}
        </div>
        {testSetup && <p className="profile-requirement" role="status">Wähle mindestens ein Tätigkeitsfeld aus. ({profile.roles.length} ausgewählt)</p>}
      </fieldset>
      <fieldset className="field-group skills-group">
        <legend>Skills</legend>
        <div className="chip-grid">
          {visibleSkills.map((skill) => {
            const active = profile.skills.includes(skill);
            return <button key={skill} type="button" aria-pressed={active} className="skill-chip" onClick={() => toggleListValue("skills", skill)}>{active && <Check aria-hidden="true" />}{skill}</button>;
          })}
        </div>
        <button type="button" className="more-skills" onClick={() => setShowAllSkills((value) => !value)}>{showAllSkills ? "Weniger anzeigen" : `Weitere ${skillOptions.length - 5} Skills`}</button>
        {testSetup && <p className="profile-requirement" role="status">Wähle mindestens einen Skill aus. ({profile.skills.length} ausgewählt)</p>}
      </fieldset>
      <div className="field-group compact-field">
        <label>Arbeitsform</label>
        <Select value={profile.workMode} onValueChange={(workMode) => onChange({ ...profile, workMode: workMode as WorkMode })}>
          <SelectTrigger className="control"><SelectValue>{profile.workMode}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="Vor Ort">Vor Ort</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem><SelectItem value="Remote">Remote</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="switch-row">
        <div><p>Deutschlandweit mobil</p><span>Alle Regionen berücksichtigen</span></div>
        <Switch checked={profile.relocation} onCheckedChange={(relocation) => onChange({ ...profile, relocation })} aria-label="Deutschlandweit mobil" />
      </div>
      <div className="profile-save">
        <Button onClick={onSave} disabled={saveStatus === "saving" || (testSetup && (!profile.roles.length || !profile.skills.length))}>
          {saveStatus === "saving" ? "Wird gespeichert …" : testSetup ? "Übernehmen & Profil speichern" : "Profil speichern"}
        </Button>
        {saveStatus === "saved" && <p role="status">Profil gespeichert.</p>}
        {saveStatus === "error" && <p role="status" data-error="true">Speichern fehlgeschlagen. Deine Änderungen bleiben lokal erhalten.</p>}
      </div>
      <Button variant="ghost" className="reset-button" onClick={() => onChange(testSetup ? { ...initialProfile, roles: [], skills: [] } : initialProfile)}><RotateCcw /> Profil zurücksetzen</Button>
    </div>
  );
}

function RegionDetail({ region }: { region: ScoredRegion }) {
  const scoreParts = [["Passende Stellen", region.components.jobs, 40], ["Nachfrage", region.components.demand, 20], ["Dynamik", region.components.trend, 15], ["Gehalt", region.components.salary, 15], ["Arbeitsmarkt", region.components.laborMarket, 10]] as const;
  return (
    <aside className="detail-panel glass-panel" aria-live="polite">
      <div className="detail-content" key={region.id}>
        <div className="detail-topline"><span><MapPin /> {region.state}</span><span className="demo-label">Demo</span></div>
        <div className="score-hero">
          <div><p className="eyebrow">Opportunity Score</p><h2>{region.name}</h2></div>
          <div className="score-ring" style={{ "--score-color": scoreColor(region.score), "--score": `${region.score}%` } as React.CSSProperties}><strong>{region.score}</strong><span>/100</span></div>
        </div>
        <p className="explanation">Dein Profil passt hier zu rund <strong>{region.matchedJobs} Stellen</strong>. Besonders gefragt sind {region.topSkills.slice(0, 2).join(" und ")}.</p>
        <div className="metric-row">
          <div><BriefcaseBusiness /><strong>{region.matchedJobs}</strong><span>passende Stellen</span></div>
          <div><TrendingUp /><strong>+{Math.round(region.trend / 5)} %</strong><span>Nachfragetrend</span></div>
        </div>
        <div className="top-skills-detail">{region.topSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <section className="breakdown">
          <div className="section-title"><h3>So entsteht der Score</h3><span>Gewichtung</span></div>
          {scoreParts.map(([label, value, weight]) => <div className="bar-row" key={label}><div><span>{label}</span><strong>{weight} %</strong></div><div className="bar-track"><i style={{ width: `${value}%` }} /></div></div>)}
        </section>
        <section className="jobs-section">
          <div className="section-title"><h3>Beste Matches</h3><button type="button">Alle <ArrowUpRight /></button></div>
          <div className="job-list">
            {region.jobs.map((job) => <article key={`${job.company}-${job.title}`}><div className="company-mark">{job.company.charAt(0)}</div><div><h4>{job.title}</h4><p>{job.company} · {job.mode}</p></div><span>{Math.min(99, job.match + Math.round((region.skillMatch - 80) / 3))} %</span></article>)}
          </div>
        </section>
      </div>
    </aside>
  );
}

function Ranking({ regions, selectedId, onSelect }: { regions: ScoredRegion[]; selectedId: string; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>("score");
  const sorted = useMemo(() => [...regions].sort((a, b) => sort === "jobs" ? b.matchedJobs - a.matchedJobs : sort === "trend" ? b.trend - a.trend : b.score - a.score), [regions, sort]);
  return (
    <section className="ranking-panel glass-panel" aria-labelledby="ranking-title">
      <div className="ranking-header">
        <div><p className="eyebrow">Dein Ranking</p><h2 id="ranking-title">Die stärksten Regionen für dein Profil</h2></div>
        <div className="sort-tabs" aria-label="Ranking sortieren">{([['score', 'Score'], ['jobs', 'Stellen'], ['trend', 'Dynamik']] as [SortKey, string][]).map(([key, label]) => <button type="button" key={key} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}</button>)}</div>
      </div>
      <div className="ranking-list">
        {sorted.map((region, index) => <button className="ranking-row" data-selected={region.id === selectedId} type="button" key={region.id} onClick={() => onSelect(region.id)}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="region-name"><strong>{region.name}</strong><small>{region.state}</small></span><span className="ranking-stat"><strong>{region.matchedJobs}</strong><small>Stellen</small></span><span className="ranking-stat positive"><strong>+{Math.round(region.trend / 5)} %</strong><small>Dynamik</small></span><span className="ranking-skills">{region.topSkills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}</span><span className="row-score" style={{ color: scoreColor(region.score) }}>{region.score}</span><ChevronRight className="row-arrow" /></button>)}
      </div>
    </section>
  );
}

function ResearchRegionDetail({ region, compact = false }: { region: ScoredRegion; compact?: boolean }) {
  const scoreParts = [["Passende Stellen", region.components.jobs], ["Nachfrage", region.components.demand], ["Dynamik", region.components.trend], ["Gehalt", region.components.salary], ["Arbeitsmarkt", region.components.laborMarket]] as const;
  return (
    <aside className={`research-detail${compact ? " research-detail--compact" : ""}`} aria-live="polite">
      <div className="research-section-label">02 — BESTE REGION</div>
      <div className="research-region-heading">
        <div><span>{region.state}</span><h2>{region.name}</h2></div>
        <div className="research-score"><strong>{region.score}</strong><span>Opportunity Score</span></div>
      </div>
      <p className="research-interpretation">Dein Profil trifft hier auf eine besonders hohe Nachfrage nach {region.topSkills.slice(0, 2).join(" und ")}.</p>

      <div className="research-metrics">
        <div><strong>{region.matchedJobs}</strong><span>passende Stellen</span></div>
        <div><strong>+{Math.round(region.trend / 5)} %</strong><span>Nachfrage</span></div>
        <div><strong>{region.skillMatch} %</strong><span>Profil-Match</span></div>
      </div>

      <section className="research-breakdown">
        <div className="research-section-label">03 — WARUM {region.score}?</div>
        {scoreParts.map(([label, value]) => (
          <div className="research-bar" key={label}>
            <div><span>{label}</span><strong>{value}</strong></div>
            <div><i style={{ width: `${value}%` }} /></div>
          </div>
        ))}
        <p>Der Opportunity Score kombiniert Profilpassung, regionale Nachfrage, Entwicklung, Gehaltsniveau und Arbeitsmarktlage.</p>
      </section>

      <section className="research-skills">
        <div className="research-section-label">04 — RELEVANTE SKILLS</div>
        <p>{region.topSkills.join(" · ")}</p>
      </section>

      <section className="research-jobs">
        <div className="research-section-label">05 — STELLEN</div>
        {region.jobs.map((job) => (
          <article key={`${job.company}-${job.title}`}>
            <div><h3>{job.title}</h3><p>{job.company} · {region.name} · {job.mode}</p></div>
            <strong>{Math.min(99, job.match + Math.round((region.skillMatch - 80) / 3))} %<span>Match</span></strong>
          </article>
        ))}
      </section>
    </aside>
  );
}

function ResearchRanking({ regions, selectedId, onSelect, onHover }: {
  regions: ScoredRegion[];
  selectedId: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const [sort, setSort] = useState<SortKey>("score");
  const sorted = useMemo(() => [...regions].sort((a, b) => sort === "jobs" ? b.matchedJobs - a.matchedJobs : sort === "trend" ? b.trend - a.trend : b.score - a.score), [regions, sort]);
  return (
    <section className="research-ranking" aria-labelledby="research-ranking-title">
      <div className="research-ranking-head">
        <div><div className="research-section-label">06 — REGIONEN</div><h2 id="research-ranking-title">Deine stärksten Arbeitsmärkte</h2></div>
        <div className="research-sort" aria-label="Ranking sortieren">
          {([['score', 'Score'], ['jobs', 'Stellen'], ['trend', 'Dynamik']] as [SortKey, string][]).map(([key, label]) => <button type="button" key={key} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}</button>)}
        </div>
      </div>
      <div className="research-ranking-list">
        {sorted.map((region, index) => (
          <button
            type="button"
            key={region.id}
            data-selected={region.id === selectedId}
            onClick={() => onSelect(region.id)}
            onMouseEnter={() => onHover(region.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(region.id)}
            onBlur={() => onHover(null)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{region.name}</strong>
            <small>{region.state}</small>
            <i>{region.matchedJobs} Stellen</i>
            <b>{region.score}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResearchProfileSummary({ profile, onChange, onSave, saveStatus }: { profile: Profile; onChange: (next: Profile) => void; onSave: () => void; saveStatus: SaveStatus }) {
  return (
    <div className="research-profile-summary">
      <div className="research-section-label">01 — DEIN PROFIL</div>
      <strong>{profile.education}</strong>
      <span>{profile.experience} · {profile.workMode}</span>
      <p>{profile.roles.slice(0, 3).join(" · ")}</p>
      <Sheet>
        <SheetTrigger asChild><button type="button">Profil bearbeiten <ArrowUpRight /></button></SheetTrigger>
        <SheetContent side="left" className="research-profile-sheet">
          <SheetHeader><SheetTitle>Profil bearbeiten</SheetTitle><SheetDescription>Alle Änderungen aktualisieren Analyse und Karte sofort.</SheetDescription></SheetHeader>
          <div className="research-profile-sheet-scroll"><ProfileControls profile={profile} onChange={onChange} onSave={onSave} saveStatus={saveStatus} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function RadarApp({ variant = "classic", testMode = false }: { variant?: "classic" | "research"; testMode?: boolean }) {
  const [profile, setProfile] = useState<Profile>(testMode ? { ...initialProfile, roles: [], skills: [] } : initialProfile);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [testSetupRequired, setTestSetupRequired] = useState(false);
  const hasEditedProfile = useRef(false);
  const [selectedId, setSelectedId] = useState("hannover");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const scoredRegions = useMemo(() => scoreAllRegions(regions, profile), [profile]);
  const selectedRegion = scoredRegions.find((region) => region.id === selectedId) ?? scoredRegions[0];

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profil konnte nicht geladen werden");
        return response.json() as Promise<{ profile: Profile | null }>;
      })
      .then(({ profile: savedProfile }) => {
        if (!active || hasEditedProfile.current) return;
        if (savedProfile) {
          setProfile(savedProfile);
        } else if (testMode) {
          setProfile({ ...initialProfile, roles: [], skills: [] });
          setTestSetupRequired(true);
          setProfileSheetOpen(true);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [testMode]);

  const updateProfile = (next: Profile) => {
    hasEditedProfile.current = true;
    setProfile(next);
    setSaveStatus("idle");
  };

  const saveProfile = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("Profil konnte nicht gespeichert werden");
      setSaveStatus("saved");
      if (testSetupRequired && profile.roles.length >= 1 && profile.skills.length >= 1) {
        setTestSetupRequired(false);
        setProfileSheetOpen(false);
      }
    } catch {
      setSaveStatus("error");
    }
  };

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: "configure_job_profile", title: "Jobprofil konfigurieren",
      description: "Aktualisiert Skills, Tätigkeitsfelder, Arbeitsform und Mobilität im sichtbaren Arbeitsmarkt-Radar.",
      inputSchema: { type: "object", properties: { skills: { type: "array", items: { type: "string", enum: skillOptions } }, roles: { type: "array", items: { type: "string", enum: roleOptions } }, workMode: { type: "string", enum: ["Vor Ort", "Hybrid", "Remote"] }, relocation: { type: "boolean" } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Ungültiges Profil");
        const update = input as Partial<Pick<Profile, "skills" | "roles" | "workMode" | "relocation">>;
        if (update.skills && update.skills.some((item) => !skillOptions.includes(item))) throw new Error("Unbekannter Skill");
        if (update.roles && update.roles.some((item) => !roleOptions.includes(item))) throw new Error("Unbekanntes Tätigkeitsfeld");
        setProfile((current) => ({ ...current, ...update }));
        return { status: "updated", fields: Object.keys(update) };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  if (variant === "research") {
    const selectResearchRegion = (id: string) => {
      setSelectedId(id);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) setMobileDetailOpen(true);
    };
    return (
      <main className="research-shell">
        <header className="research-header">
          <Link href="/design-minds" className="research-brand">Arbeitsmarkt Radar</Link>
          <nav aria-label="Ansichten und Informationen">
            <a href="#research-profile">Profil</a>
            <a href="#research-map">Arbeitsmarkt</a>
            <span>Datenstand · Demo</span>
            <Link href="/">Originalansicht ↗</Link>
          </nav>
        </header>

        <section className="research-intro" id="research-profile">
          <div>
            <div className="research-section-label">ARBEITSMARKT-RESEARCH · DEUTSCHLAND</div>
            <h1>Wo werden deine<br />Fähigkeiten gebraucht?</h1>
            <p>Wir kombinieren dein Profil mit Stellenanzeigen und regionalen Arbeitsmarktdaten und zeigen dir, wo deine Chancen besonders hoch sind.</p>
          </div>
          <ResearchProfileSummary profile={profile} onChange={updateProfile} onSave={saveProfile} saveStatus={saveStatus} />
        </section>

        <section className="research-analysis" id="research-map">
          <div className="research-map-column">
            <div className="research-map-kicker"><span>01 — OPPORTUNITY MAP</span><strong>Deutschland · Demodaten</strong></div>
            <OpportunityMap regions={scoredRegions} selectedId={hoveredRegionId ?? selectedRegion.id} onSelect={selectResearchRegion} visualVariant="research" />
          </div>
          <ResearchRegionDetail region={selectedRegion} />
        </section>

        <ResearchRanking regions={scoredRegions} selectedId={selectedRegion.id} onSelect={selectResearchRegion} onHover={setHoveredRegionId} />

        <footer className="research-footer"><span>Arbeitsmarkt Radar · Research-Variante</span><span>Alle Stellen- und Scorewerte sind simulierte Demodaten.</span></footer>

        <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
          <SheetContent side="bottom" className="research-mobile-sheet">
            <SheetHeader className="sr-only"><SheetTitle>Regionsanalyse {selectedRegion.name}</SheetTitle><SheetDescription>Opportunity Score und passende Stellen.</SheetDescription></SheetHeader>
            <ResearchRegionDetail region={selectedRegion} compact />
          </SheetContent>
        </Sheet>
      </main>
    );
  }

  return (
    <>
      {!testMode && <CinematicIntro />}
      <main className="app-shell">
      <header className="topbar">
        <a href="#main-workspace" className="brand" aria-label="Arbeitsmarkt Radar Startseite"><span className="brand-mark"><MapPin /></span><span>Arbeitsmarkt <strong>Radar</strong></span></a>
        <div className="topbar-actions">
          {!testMode && <a className="design-variant-link" href="/design-minds">Research Design</a>}
          <div className="profile-summary"><span>Aktives Profil</span><strong>{profile.roles[0] ?? "Profil vervollständigen"} · {profile.experience}</strong><i>Demo</i></div>
          <Sheet open={testMode ? profileSheetOpen : undefined} onOpenChange={(open) => {
            if (!open && testSetupRequired) return;
            setProfileSheetOpen(open);
          }}>
            <SheetTrigger asChild><Button variant="outline" className="mobile-profile-button"><SlidersHorizontal /> Profil anpassen</Button></SheetTrigger>
            <SheetContent side="left" className="mobile-profile-sheet">
              <SheetHeader><SheetTitle>Profil anpassen</SheetTitle><SheetDescription>Deine Änderungen aktualisieren Karte und Ranking sofort.</SheetDescription></SheetHeader>
              <div className="mobile-profile-scroll"><ProfileControls profile={profile} onChange={updateProfile} onSave={saveProfile} saveStatus={saveStatus} testSetup={testSetupRequired} /></div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="workspace" id="main-workspace">
        <aside className="profile-panel glass-panel desktop-profile"><ProfileControls profile={profile} onChange={updateProfile} onSave={saveProfile} saveStatus={saveStatus} /></aside>
        <div className="center-column"><OpportunityMap regions={scoredRegions} selectedId={selectedRegion.id} onSelect={setSelectedId} deferUntilVisible /><Ranking regions={scoredRegions} selectedId={selectedRegion.id} onSelect={setSelectedId} /></div>
        <RegionDetail region={selectedRegion} />
      </div>
      <footer className="app-footer"><span>Arbeitsmarkt Radar · Konzeptprototyp</span><span>Stellen- und Scorewerte sind simulierte Demodaten.</span></footer>
      </main>
    </>
  );
}

export default function Home() {
  return <RadarApp />;
}
