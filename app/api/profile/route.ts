import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { regions, roleOptions, skillOptions, type Profile } from "@/lib/market-data";

const COOKIE_NAME = "radar_profile_id";
const TEST_COOKIE_NAME = "radar_test_profile_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const profileSchema = z.object({
  education: z.enum(["Master Wirtschaft & Management", "Bachelor Wirtschaft", "Kaufmännische Ausbildung"]),
  experience: z.enum(["Berufseinstieg", "1–3 Jahre Erfahrung", "3–5 Jahre Erfahrung"]),
  roles: z.array(z.string().refine((value) => roleOptions.includes(value))).max(roleOptions.length),
  skills: z.array(z.string().refine((value) => skillOptions.includes(value))).max(skillOptions.length),
  workMode: z.enum(["Vor Ort", "Hybrid", "Remote"]),
  relocation: z.boolean(),
  preferredRegions: z.array(z.string().refine((value) => regions.some((region) => region.id === value))).max(regions.length),
}).strict();

function getCookie(request: Request, cookieName: string) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  const value = cookie?.slice(cookieName.length + 1);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function getCookieName(request: Request) {
  return new URL(request.url).searchParams.get("scope") === "test" ? TEST_COOKIE_NAME : COOKIE_NAME;
}

function jsonResponse(body: unknown, status: number, profileId: string, request: Request, replaceCookie = false) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  const cookieName = getCookieName(request);
  if (replaceCookie || !getCookie(request, cookieName)) {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    headers.append("Set-Cookie", `${cookieName}=${profileId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function serializeProfile(profile: typeof profiles.$inferSelect): Profile {
  return {
    education: profile.education,
    experience: profile.experience,
    roles: JSON.parse(profile.roles) as string[],
    skills: JSON.parse(profile.skills) as string[],
    workMode: profile.workMode as Profile["workMode"],
    relocation: profile.relocation,
    preferredRegions: JSON.parse(profile.preferredRegions) as string[],
  };
}

export async function GET(request: Request) {
  const cookieName = getCookieName(request);
  const profileId = getCookie(request, cookieName) ?? crypto.randomUUID();
  try {
    const saved = await getDb().select().from(profiles).where(eq(profiles.id, profileId)).get();
    return jsonResponse({ profile: saved ? serializeProfile(saved) : null }, 200, profileId, request);
  } catch {
    return jsonResponse({ error: "Profil konnte nicht geladen werden" }, 503, profileId, request);
  }
}

export async function PUT(request: Request) {
  const profileId = getCookie(request) ?? crypto.randomUUID();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ungültiges JSON" }, 400, profileId, request);
  }

  const result = profileSchema.safeParse(payload);
  if (!result.success) return jsonResponse({ error: "Ungültiges Profil" }, 400, profileId, request);

  const profile = result.data;
  const updatedAt = new Date().toISOString();
  try {
    await getDb().insert(profiles).values({
      id: profileId,
      education: profile.education,
      experience: profile.experience,
      roles: JSON.stringify(profile.roles),
      skills: JSON.stringify(profile.skills),
      workMode: profile.workMode,
      relocation: profile.relocation,
      preferredRegions: JSON.stringify(profile.preferredRegions),
      updatedAt,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        education: profile.education,
        experience: profile.experience,
        roles: JSON.stringify(profile.roles),
        skills: JSON.stringify(profile.skills),
        workMode: profile.workMode,
        relocation: profile.relocation,
        preferredRegions: JSON.stringify(profile.preferredRegions),
        updatedAt,
      },
    }).run();
    return jsonResponse({ success: true }, 200, profileId, request);
  } catch {
    return jsonResponse({ error: "Profil konnte nicht gespeichert werden" }, 503, profileId, request);
  }
}


export async function DELETE(request: Request) {
  if (new URL(request.url).searchParams.get("scope") !== "test") {
    return new Response(JSON.stringify({ error: "Nur Testprofile können zurückgesetzt werden" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const profileId = getCookie(request, TEST_COOKIE_NAME);
  try {
    if (profileId) {
      await getDb().delete(profiles).where(eq(profiles.id, profileId)).run();
    }
    return jsonResponse({ success: true }, 200, crypto.randomUUID(), request, true);
  } catch {
    return new Response(JSON.stringify({ error: "Testsession konnte nicht zurückgesetzt werden" }), {
      status: 503,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
