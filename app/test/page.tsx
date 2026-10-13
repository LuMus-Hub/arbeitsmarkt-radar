"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadarApp } from "../page";

export default function TestPage() {
  const [testStarted, setTestStarted] = useState(false);

  if (testStarted) return <RadarApp testMode />;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-emerald-200/30 blur-3xl sm:size-96" />
        <div className="absolute -right-24 bottom-0 size-80 rounded-full bg-teal-100/50 blur-3xl sm:size-[28rem]" />
      </div>

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center rounded-[2rem] border border-white/80 bg-white/70 px-6 py-12 text-center shadow-[0_30px_90px_rgba(17,67,49,0.10)] backdrop-blur-xl sm:px-12 sm:py-16">
        <span className="inline-flex items-center rounded-full border border-emerald-800/10 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#075441] sm:text-sm">
          Prototyp · simulierte Demodaten
        </span>

        <h1 className="mt-8 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-[-0.05em] text-[#14211c] sm:text-5xl md:text-6xl">
          Finde heraus, in welchen Regionen dein Profil gute Chancen hat.
        </h1>

        <Button
          size="lg"
          className="mt-9 h-12 min-w-44 rounded-full px-7 text-base shadow-lg shadow-emerald-950/15"
          onClick={() => setTestStarted(true)}
        >
          Test starten
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
    </main>
  );
}
