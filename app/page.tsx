"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Check, ChevronDown, ChevronRight, MapPin, RotateCcw, SlidersHorizontal, TrendingUp } from "lucide-react";
import { OpportunityMap } from "@/components/opportunity-map";
import { CinematicIntro } from "@/components/cinematic-intro";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { initialProfile, regions, roleOptions, skillOptions, type Profile, type WorkMode } from "@/lib/market-data";
import { scoreAllRegions, type ScoredRegion } from "@/lib/scoring";

type SortKey = "score" | "jobs" | "trend";

function scoreColor(score: number) {
  if (score >= 88) return "#075441";
  if (score >= 83) return "#22765D";
  if (score >= 78) return "#72A995";
  return "#C7D8D1";
}

const averageDemoTrend = regions.reduce((sum, region) => sum + region.trend, 0) / regions.length;

function getRegionReasons(region: ScoredRegion, profile: Profile) {
  const selectedDemand = [
    ...profile.skills.map((label) => ({ label, value: region.skillDemand[label] })),
    ...profile.roles.map((label) => ({ label, value: region.roleDemand[label] })),
  ].filter((item): item is { label: string; value: number } => item.value !== undefined);
  const strongestDemand = selectedDemand.sort((a, b) => b.value - a.value)[0];
  const demandReason = strongestDemand
    ? `${strongestDemand.value >= 85 ? "Hohe Nachfrage nach" : "Nachfragewert für"} ${strongestDemand.label}: ${strongestDemand.value}/100.`
    : "Wähle Skills oder Tätigkeitsfelder, um die Nachfrage gezielt einzuordnen.";

  const trendReason = region.trend > averageDemoTrend
    ? `Arbeitsmarktdynamik über dem Demo-Mittelwert (${region.trend}/100).`
    : `Arbeitsmarktdynamik: ${region.trend}/100 (Demo-Mittelwert: ${Math.round(averageDemoTrend)}/100).`;

  let profileReason = "Profilangaben noch unvollständig; eine starke Profilpassung lässt sich noch nicht ableiten.";
  if (profile.skills.length && profile.roles.length) {
    profileReason = region.skillMatch >= 85 && region.roleMatch >= 85
      ? `Starke Profilpassung: Skills ${region.skillMatch}/100, Tätigkeitsfeld ${region.roleMatch}/100.`
      : `Profilpassung: Skills ${region.skillMatch}/100, Tätigkeitsfeld ${region.roleMatch}/100.`;
  } else if (profile.skills.length) {
    profileReason = `Skill-Passung: ${region.skillMatch}/100.`;
  } else if (profile.roles.length) {
    profileReason = `Passung zum Tätigkeitsfeld: ${region.roleMatch}/100.`;
  }

  return [demandReason, trendReason, profileReason];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function ProfileControls({ profile, onChange, onSave, saveStatus, testSetup = false }: { profile: Profile; onChange: (next: Profile) => void; onSave: () => void; saveStatus: SaveStatus; testSetup?: boolean }) {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const mobilityId = useId();
  const [showOptionalRegions, setShowOptionalRegions] = useState(false);
  const toggleListValue = (key: "roles" | "skills", value: string) => {
    const current = profile[key];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onChange({ ...profile, [key]: next });
  };
  const visibleSkills = showAllSkills ? skillOptions : skillOptions.slice(0, 5);
  const testProfileValid = profile.roles.length > 0 && profile.skills.length > 0 && (profile.relocation || profile.preferredRegions.length > 0);

  return (
    <div className="profile-controls">
      <div className="panel-heading">
        <div><p className="eyebrow">Dein Profil</p><h2>Was bringst du mit?</h2></div>
        <SlidersHorizontal aria-hidden="true" />
      </div>
      <div className="field-group">
        <label>Abschluss</label>
        <Select value={profile.education} onValueChange={(education) => onChange({ ...profile, education })}>
          <SelectTrigger className="control profile-select-trigger"><SelectValue className="profile-select-value">{profile.education}</SelectValue></SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={8} className="profile-select-menu">
            <SelectItem value="Master Wirtschaft & Management">Master Wirtschaft & Management</SelectItem>
            <SelectItem value="Bachelor Wirtschaft">Bachelor Wirtschaft</SelectItem>
            <SelectItem value="Kaufmännische Ausbildung">Kaufmännische Ausbildung</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="field-group">
        <label>Erfahrungslevel</label>
        <Select value={profile.experience} onValueChange={(experience) => onChange({ ...profile, experience })}>
          <SelectTrigger className="control profile-select-trigger"><SelectValue className="profile-select-value">{profile.experience}</SelectValue></SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={8} className="profile-select-menu">
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
          <SelectTrigger className="control profile-select-trigger"><SelectValue className="profile-select-value">{profile.workMode}</SelectValue></SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4} collisionPadding={8} className="profile-select-menu"><SelectItem value="Vor Ort">Vor Ort</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem><SelectItem value="Remote">Remote</SelectItem></SelectContent>
        </Select>
      </div>
      <fieldset className="field-group mobility-group">
        <legend>Wo möchtest du arbeiten?</legend>
        <RadioGroup
          aria-label="Wo möchtest du arbeiten?"
          className="mobility-options"
          value={profile.relocation ? "nationwide" : "regional"}
          onValueChange={(value) => onChange({ ...profile, relocation: value === "nationwide" })}
        >
          <div className="mobility-option" data-selected={profile.relocation}>
            <RadioGroupItem id={`${mobilityId}-nationwide`} value="nationwide" />
            <label className="mobility-option-copy" htmlFor={`${mobilityId}-nationwide`}>
              <strong>Deutschlandweit offen</strong>
              <small>Ich bin bereit, deutschlandweit zu arbeiten. Alle Regionen werden gleichberechtigt berücksichtigt.</small>
            </label>
          </div>
          <div className="mobility-option" data-selected={!profile.relocation}>
            <RadioGroupItem id={`${mobilityId}-regional`} value="regional" />
            <label className="mobility-option-copy" htmlFor={`${mobilityId}-regional`}>
              <strong>Auf bestimmte Regionen konzentriert</strong>
              <small>Ich möchte bevorzugt in ausgewählten Regionen arbeiten. Andere Regionen bleiben sichtbar, werden aber niedriger bewertet.</small>
            </label>
          </div>
        </RadioGroup>
      </fieldset>
      <Collapsible open={!profile.relocation || showOptionalRegions} onOpenChange={setShowOptionalRegions} className="preferred-regions">
        {profile.relocation ? (
          <CollapsibleTrigger asChild>
            <button type="button" className="preferred-regions-toggle" aria-expanded={showOptionalRegions}>
              <span>Bevorzugte Regionen angeben (optional)</span>
              <ChevronDown aria-hidden="true" />
            </button>
          </CollapsibleTrigger>
        ) : (
          <p className="preferred-regions-heading">Bevorzugte Regionen auswählen <span>(mindestens eine erforderlich)</span></p>
        )}
        <CollapsibleContent>
          <fieldset className="field-group preferred-regions-list">
            <legend className="sr-only">Bevorzugte Regionen</legend>
            <div className="check-list">
              {regions.map((region) => (
                <label className="check-row" key={region.id}>
                  <Checkbox
                    checked={profile.preferredRegions.includes(region.id)}
                    onCheckedChange={() => {
                      const preferredRegions = profile.preferredRegions.includes(region.id)
                        ? profile.preferredRegions.filter((id) => id !== region.id)
                        : [...profile.preferredRegions, region.id];
                      onChange({ ...profile, preferredRegions });
                    }}
                  />
                  <span>{region.name}</span>
                </label>
              ))}
            </div>
            {testSetup && !profile.relocation && profile.preferredRegions.length === 0 && <p className="profile-requirement" role="status">Wähle mindestens eine bevorzugte Region aus, bevor du das Profil übernimmst.</p>}
          </fieldset>
        </CollapsibleContent>
      </Collapsible>
      <div className="profile-save">
        <Button onClick={onSave} disabled={saveStatus === "saving" || (testSetup && !testProfileValid)}>
          {saveStatus === "saving" ? "Wird gespeichert …" : testSetup ? "Übernehmen & Profil speichern" : "Profil speichern"}
        </Button>
        {saveStatus === "saved" && <p role="status">Profil gespeichert.</p>}
        {saveStatus === "error" && <p role="status" data-error="true">Speichern fehlgeschlagen. Deine Änderungen bleiben lokal erhalten.</p>}
      </div>
      <Button variant="ghost" className="reset-button" onClick={() => onChange(testSetup ? { ...initialProfile, roles: [], skills: [], preferredRegions: [] } : initialProfile)}><RotateCcw /> Profil zurücksetzen</Button>
    </div>
  );
}

function RegionDetail({ region, profile, isManual }: { region: ScoredRegion; profile: Profile; isManual: boolean }) {
  const scoreParts = [["Demo-Stellenpassung", region.components.jobs, 40], ["Nachfrage", region.components.demand, 20], ["Dynamik", region.components.trend, 15], ["Gehalt", region.components.salary, 15], ["Arbeitsmarkt", region.components.laborMarket, 10]] as const;
  const reasons = getRegionReasons(region, profile);
  const isPreferred = profile.preferredRegions.includes(region.id);
  const preferenceAdjustment = profile.relocation ? (isPreferred ? 3 : 0) : (isPreferred ? 3 : -9);
  const preferenceLabel = preferenceAdjustment > 0 ? `+${preferenceAdjustment}` : String(preferenceAdjustment);
  return (
    <aside className="detail-panel glass-panel" aria-live="polite">
      <div className="detail-content" key={region.id}>
        <div className="detail-topline"><span><MapPin /> {region.state}</span><span className="demo-label">Demo</span></div>
        <p className="region-selection-indicator" data-manual={isManual}>{isManual ? "Manuell ausgewählt" : "Top-Empfehlung · automatisch ausgewählt"}</p>
        <div className="score-hero">
          <div><p className="eyebrow">Opportunity Score</p><h2>{region.name}</h2></div>
          <div className="score-ring" style={{ "--score-color": scoreColor(region.score), "--score": `${region.score}%` } as React.CSSProperties}><strong>{region.score}</strong><span>/100</span></div>
        </div>
        <p className="explanation">Dein Profil passt hier laut Demo zu rund <strong>{region.matchedJobs} simulierten Stellen</strong>. Besonders gefragt sind {region.topSkills.slice(0, 2).join(" und ")}.</p>
        <div className="metric-row">
          <div><BriefcaseBusiness /><strong>{region.matchedJobs}</strong><span>passende Stellen (Demo)</span></div>
          <div><TrendingUp /><strong>+{Math.round(region.trend / 5)} %</strong><span>Nachfragetrend</span></div>
        </div>
        <div className="top-skills-detail">{region.topSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <section className="breakdown">
          <div className="section-title"><h3>So entsteht der Score</h3><span>Wert · Gewichtung</span></div>
          {scoreParts.map(([label, value, weight]) => <div className="bar-row" key={label}><div><span>{label}</span><strong>{value}/100 · {weight} %</strong></div><div className="bar-track" aria-hidden="true"><i style={{ width: `${value}%` }} /></div></div>)}
          <div className="score-reasons" aria-label={`Warum ${region.name} zu deinem Profil passt`}>
            <h4>Warum diese Region?</h4>
            <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
          <p className="score-adjustment">Regionale Präferenz: <strong>{preferenceLabel} Punkte</strong> ({isPreferred ? "bevorzugte Region" : profile.relocation ? "deutschlandweit offen" : "nicht bevorzugt"}). Die Komponenten werden gewichtet kombiniert, danach wird die Präferenz berücksichtigt und der Score auf 0–100 begrenzt.</p>
        </section>
        <section className="jobs-section">
          <div className="section-title"><h3>Beispielstellen (Demo)</h3></div>
          <p className="demo-jobs-note">Simulierte Beispiele und Kennzahlen, keine geprüften aktuellen Stellenangebote.</p>
          <div className="job-list">
            {region.jobs.map((job) => <article key={`${job.company}-${job.title}`}><div className="company-mark">{job.company.charAt(0)}</div><div><h4>{job.title}</h4><p>{job.company} · {job.mode}</p></div><span>Demo-Match {Math.min(99, job.match + Math.round((region.skillMatch - 80) / 3))} %</span></article>)}
          </div>
        </section>
      </div>
    </aside>
  );
}

function TopThreeRegions({ regions, selectedId, onSelect }: { regions: ScoredRegion[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="top-three-regions" aria-label="Top 3 nach Opportunity Score">
      <div className="top-three-heading"><strong>Top 3 · Opportunity Score</strong><span>Unabhängig von der Listensortierung</span></div>
      <div className="top-three-grid">
        {regions.slice(0, 3).map((region, index) => (
          <button type="button" className="top-three-card" key={region.id} data-recommended={index === 0} data-selected={region.id === selectedId} aria-pressed={region.id === selectedId} onClick={() => onSelect(region.id)}>
            <span className="top-three-position">#{index + 1}{index === 0 && <small>Empfehlung</small>}</span>
            <strong>{region.name}</strong>
            <span className="top-three-score">{region.score}<small>/100</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Ranking({ regions, selectedId, onSelect }: { regions: ScoredRegion[]; selectedId: string; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<SortKey>("score");
  const sorted = useMemo(() => [...regions].sort((a, b) => sort === "jobs" ? b.matchedJobs - a.matchedJobs : sort === "trend" ? b.trend - a.trend : b.score - a.score), [regions, sort]);
  return (
    <section className="ranking-panel glass-panel" aria-labelledby="ranking-title">
      <div className="ranking-header">
        <div><p className="eyebrow">Dein Ranking</p><h2 id="ranking-title">Die stärksten Regionen für dein Profil</h2></div>
        <div className="sort-tabs" aria-label="Ranking sortieren">{([['score', 'Score'], ['jobs', 'Demo-Stellen'], ['trend', 'Dynamik']] as [SortKey, string][]).map(([key, label]) => <button type="button" key={key} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}</button>)}</div>
      </div>
      <TopThreeRegions regions={regions} selectedId={selectedId} onSelect={onSelect} />
      <div className="ranking-list">
        {sorted.map((region, index) => <button className="ranking-row" data-selected={region.id === selectedId} aria-pressed={region.id === selectedId} type="button" key={region.id} onClick={() => onSelect(region.id)}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className="region-name"><strong>{region.name}</strong><small>{region.state}</small></span><span className="ranking-stat"><strong>{region.matchedJobs}</strong><small>Demo-Stellen</small></span><span className="ranking-stat positive"><strong>+{Math.round(region.trend / 5)} %</strong><small>Dynamik</small></span><span className="ranking-skills">{region.topSkills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}</span><span className="row-score" style={{ color: scoreColor(region.score) }}>{region.score}</span><ChevronRight className="row-arrow" /></button>)}
      </div>
    </section>
  );
}

export function RadarApp({ testMode = false, onTestReset }: { testMode?: boolean; onTestReset?: () => void }) {
  const [profile, setProfile] = useState<Profile>(testMode ? { ...initialProfile, roles: [], skills: [] } : initialProfile);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [testSetupRequired, setTestSetupRequired] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const resetInProgressRef = useRef(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const hasEditedProfile = useRef(false);
  const [manualSelection, setManualSelection] = useState<{ profile: Profile; regionId: string } | null>(null);
  const scoredRegions = useMemo(() => scoreAllRegions(regions, profile), [profile]);
  const isManualSelection = manualSelection?.profile === profile && scoredRegions.some((region) => region.id === manualSelection.regionId);
  const selectedId = isManualSelection ? (manualSelection?.regionId ?? scoredRegions[0].id) : scoredRegions[0].id;
  const selectedRegion = scoredRegions.find((region) => region.id === selectedId) ?? scoredRegions[0];
  const selectRegion = (regionId: string) => setManualSelection({ profile, regionId });

  useEffect(() => {
    let active = true;
    void fetch(testMode ? "/api/profile?scope=test" : "/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profil konnte nicht geladen werden");
        return response.json() as Promise<{ profile: Profile | null }>;
      })
      .then(({ profile: savedProfile }) => {
        if (!active || hasEditedProfile.current) return;
        if (savedProfile) {
          setProfile(savedProfile);
          if (testMode) {
            const needsSetup = !savedProfile.roles.length || !savedProfile.skills.length || (!savedProfile.relocation && !savedProfile.preferredRegions.length);
            setTestSetupRequired(needsSetup);
            setProfileSheetOpen(needsSetup);
          }
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
    setProfile((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    setSaveStatus("idle");
  };

  const resetTestSession = async () => {
    if (!testMode || saveStatus === "saving" || resetInProgressRef.current) return;
    resetInProgressRef.current = true;
    setResetInProgress(true);
    setResetError(null);
    try {
      const response = await fetch("/api/profile?scope=test", { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("Testsession konnte nicht zurückgesetzt werden");
      onTestReset?.();
    } catch {
      setResetError("Zurücksetzen fehlgeschlagen. Bitte versuche es erneut.");
      resetInProgressRef.current = false;
      setResetInProgress(false);
    }
  };

  const saveProfile = async () => {
    if (testMode && (!profile.roles.length || !profile.skills.length || (!profile.relocation && !profile.preferredRegions.length))) return;
    setSaveStatus("saving");
    try {
      const response = await fetch(testMode ? "/api/profile?scope=test" : "/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("Profil konnte nicht gespeichert werden");
      setSaveStatus("saved");
      if (testSetupRequired && profile.roles.length >= 1 && profile.skills.length >= 1 && (profile.relocation || profile.preferredRegions.length >= 1)) {
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
        hasEditedProfile.current = true;
        setProfile((current) => {
          const next = { ...current, ...update };
          return JSON.stringify(current) === JSON.stringify(next) ? current : next;
        });
        setSaveStatus("idle");
        return { status: "updated", fields: Object.keys(update) };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);


  return (
    <>
      {!testMode && <CinematicIntro />}
      <main className="app-shell">
      <header className="topbar">
        <a href="#main-workspace" className="brand" aria-label="Arbeitsmarkt Radar Startseite"><span className="brand-mark"><MapPin /></span><span>Arbeitsmarkt <strong>Radar</strong></span></a>
        <div className="topbar-actions">
          <div className="profile-summary"><span>Aktives Profil</span><strong>{profile.roles[0] ?? "Profil vervollständigen"} · {profile.experience}</strong><i>Demo</i></div>
          {testMode && (
            <AlertDialog open={resetDialogOpen} onOpenChange={(open) => {
              if (resetInProgress) return;
              setResetDialogOpen(open);
              if (open) setResetError(null);
            }}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Neue Testperson / Test zurücksetzen"
                  title="Neue Testperson / Test zurücksetzen"
                  disabled={saveStatus === "saving" || resetInProgress}
                  className="h-10 shrink-0 rounded-full px-3 text-xs sm:px-4"
                >
                  <RotateCcw aria-hidden="true" />
                  <span className="hidden min-[480px]:inline">Neue Testperson</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Test für nächste Person zurücksetzen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Das gespeicherte Testprofil dieser Person wird gelöscht. Danach startet eine neue anonyme Testsitzung.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {resetError && <p role="alert" className="text-sm text-destructive">{resetError}</p>}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={resetInProgress}>Abbrechen</AlertDialogCancel>
                  <Button type="button" onClick={() => void resetTestSession()} disabled={resetInProgress || saveStatus === "saving"}>
                    {resetInProgress ? "Wird zurückgesetzt …" : "Test zurücksetzen"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Sheet open={testMode ? profileSheetOpen : undefined} onOpenChange={(open) => {
            const invalidTestProfile = !profile.roles.length || !profile.skills.length || (!profile.relocation && !profile.preferredRegions.length);
            if (!open && testMode && invalidTestProfile) return;
            setProfileSheetOpen(open);
          }}>
            <SheetTrigger asChild><Button variant="outline" className="mobile-profile-button"><SlidersHorizontal /> Profil anpassen</Button></SheetTrigger>
            <SheetContent side="left" className="mobile-profile-sheet">
              <SheetHeader><SheetTitle>Profil anpassen</SheetTitle><SheetDescription>Deine Änderungen aktualisieren Karte und Ranking sofort.</SheetDescription></SheetHeader>
              <div className="mobile-profile-scroll"><ProfileControls profile={profile} onChange={updateProfile} onSave={saveProfile} saveStatus={saveStatus} testSetup={testMode} /></div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="workspace" id="main-workspace">
        <aside className="profile-panel glass-panel desktop-profile"><ProfileControls profile={profile} onChange={updateProfile} onSave={saveProfile} saveStatus={saveStatus} /></aside>
        <div className="center-column"><OpportunityMap regions={scoredRegions} selectedId={selectedRegion.id} onSelect={selectRegion} deferUntilVisible /><Ranking regions={scoredRegions} selectedId={selectedRegion.id} onSelect={selectRegion} /></div>
        <RegionDetail region={selectedRegion} profile={profile} isManual={Boolean(isManualSelection)} />
      </div>
      <footer className="app-footer"><span>Arbeitsmarkt Radar · Konzeptprototyp</span><span>Stellen- und Scorewerte sind simulierte Demodaten.</span></footer>
      </main>
    </>
  );
}

export default function Home() {
  return <RadarApp />;
}
