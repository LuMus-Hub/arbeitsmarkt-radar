import type { Profile, Region } from "./market-data";

export type ScoredRegion = Region & {
  score: number;
  skillMatch: number;
  matchedJobs: number;
  components: {
    jobs: number;
    demand: number;
    trend: number;
    salary: number;
    laborMarket: number;
  };
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export function calculateRegionScore(region: Region, profile: Profile): ScoredRegion {
  const selectedSkills = profile.skills.length ? profile.skills : ["Projektmanagement"];
  const skillMatch = Math.round(
    selectedSkills.reduce((sum, skill) => sum + (region.skillDemand[skill] ?? 54), 0) /
      selectedSkills.length,
  );

  const roleSignal = profile.roles.length
    ? profile.roles.reduce((sum, role) => sum + (region.skillDemand[role] ?? 72), 0) /
      profile.roles.length
    : 70;
  const modeFit = profile.workMode === "Hybrid" ? 100 : profile.workMode === "Remote" ? 82 : 88;
  const preferenceBoost = profile.preferredRegions.includes(region.id) ? 8 : 0;
  const relocationFactor = profile.relocation ? 1 : profile.preferredRegions.includes(region.id) ? 1 : 0.55;
  const matchedJobs = Math.round(
    region.baseJobs * (0.28 + skillMatch / 145) * (0.9 + roleSignal / 1000) * relocationFactor,
  );
  const jobVolume = clamp((matchedJobs / 330) * 100);
  const jobQuality = clamp(skillMatch * 0.55 + roleSignal * 0.25 + jobVolume * 0.15 + modeFit * 0.05);

  const components = {
    jobs: Math.round(jobQuality),
    demand: region.demand,
    trend: region.trend,
    salary: region.salary,
    laborMarket: region.laborMarket,
  };

  const score = clamp(
    Math.round(
      components.jobs * 0.4 +
        components.demand * 0.2 +
        components.trend * 0.15 +
        components.salary * 0.15 +
        components.laborMarket * 0.1 +
        preferenceBoost,
    ),
  );

  return { ...region, score, skillMatch, matchedJobs, components };
}

export function scoreAllRegions(regions: Region[], profile: Profile): ScoredRegion[] {
  return regions
    .map((region) => calculateRegionScore(region, profile))
    .sort((a, b) => b.score - a.score);
}
