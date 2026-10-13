import type { Profile, Region } from "./market-data";

export type ScoredRegion = Region & {
  score: number;
  skillMatch: number;
  roleMatch: number;
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

  const roleMatch = Math.round(
    profile.roles.length
      ? profile.roles.reduce((sum, role) => sum + (region.roleDemand[role] ?? 70), 0) /
          profile.roles.length
      : 70,
  );
  const modeFit = profile.workMode === "Hybrid" ? 100 : profile.workMode === "Remote" ? 82 : 88;
  const preferred = profile.preferredRegions.includes(region.id);
  const mobilityFactor = profile.relocation || preferred ? 1 : 0.56;
  const matchedJobs = Math.round(
    region.baseJobs *
      (0.28 + skillMatch / 145) *
      (0.72 + roleMatch / 300) *
      mobilityFactor,
  );
  const jobVolume = clamp((matchedJobs / 330) * 100);
  const jobQuality = clamp(
    skillMatch * 0.45 + roleMatch * 0.4 + jobVolume * 0.1 + modeFit * 0.05,
  );

  const components = {
    jobs: Math.round(jobQuality),
    demand: region.demand,
    trend: region.trend,
    salary: region.salary,
    laborMarket: region.laborMarket,
  };

  const preferenceAdjustment = profile.relocation
    ? preferred ? 3 : 0
    : preferred ? 3 : -9;
  const score = clamp(
    Math.round(
      components.jobs * 0.4 +
        components.demand * 0.2 +
        components.trend * 0.15 +
        components.salary * 0.15 +
        components.laborMarket * 0.1 +
        preferenceAdjustment,
    ),
  );

  return { ...region, score, skillMatch, roleMatch, matchedJobs, components };
}

export function scoreAllRegions(regions: Region[], profile: Profile): ScoredRegion[] {
  return regions
    .map((region) => calculateRegionScore(region, profile))
    .sort((a, b) => b.score - a.score);
}
