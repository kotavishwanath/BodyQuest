"use client";

import { ChevronRight, Focus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { conceptTrail } from "@/lib/atlas/catalogue";
import { ATLAS_NOTES, noteForConcept } from "@/lib/atlas/notes";
import { useAtlasStore } from "@/lib/atlas/store";
import { ATLAS_SYSTEM } from "@/lib/atlas/systems";
import { cn } from "@/lib/utils";
import type { AtlasCatalogue, AtlasMcq, AtlasNote, AtlasSystemId } from "@/types/atlas";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 leading-relaxed marker:text-primary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** One question at a time with instant feedback. */
function McqPractice({ mcqs }: { mcqs: AtlasMcq[] }) {
  const t = useTranslations("Atlas.mcq");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= mcqs.length;

  if (done) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <p className="font-semibold">{t("score", { score, total: mcqs.length })}</p>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setScore(0);
          }}
          className="mt-2 min-h-[var(--tap)] rounded-full border px-4 text-sm font-semibold hover:bg-muted"
        >
          {t("restart")}
        </button>
      </div>
    );
  }

  const q = mcqs[index];
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{t("question", { current: index + 1, total: mcqs.length })}</p>
      <p className="mt-1 font-semibold leading-snug">{q.stem}</p>
      <div className="mt-2 grid gap-1.5" role="group" aria-label={q.stem}>
        {q.options.map((option, i) => {
          const state = picked === null ? "idle" : i === q.answer ? "right" : i === picked ? "wrong" : "idle";
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                if (i === q.answer) setScore((s) => s + 1);
              }}
              className={cn(
                "min-h-[var(--tap)] rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-default",
                state === "right" && "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                state === "wrong" && "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
              )}
            >
              <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div role="status" className="mt-2 text-sm">
          <p className="font-semibold">{picked === q.answer ? t("correct") : t("wrong", { answer: q.options[q.answer] })}</p>
          <p className="mt-1 text-muted-foreground">{q.explanation}</p>
          <button
            type="button"
            onClick={() => {
              setIndex((n) => n + 1);
              setPicked(null);
            }}
            className="mt-2 min-h-[var(--tap)] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            {t("tryAnother")}
          </button>
        </div>
      )}
    </div>
  );
}

function NoteBody({ note, mode }: { note: AtlasNote; mode: "junior" | "bipc" }) {
  const t = useTranslations("Atlas");
  if (mode === "junior") {
    return (
      <>
        <p className="mt-3 text-base leading-relaxed">{note.junior}</p>
        <Section title={t("sections.functions")}>
          <Bullets items={note.functions} />
        </Section>
        {note.numbers && (
          <Section title={t("sections.numbers")}>
            <Bullets items={note.numbers} />
          </Section>
        )}
      </>
    );
  }
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {note.syllabus.map((ref) => (
          <span
            key={`${ref.class}-${ref.chapter}`}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              ref.ncert === false ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-primary/10 text-primary",
            )}
          >
            {t("classChapter", { class: ref.class, chapter: ref.chapter })}
          </span>
        ))}
      </div>
      {note.syllabus.every((ref) => ref.ncert === false) && <p className="mt-1 text-xs text-muted-foreground">{t("stateBoard")}</p>}
      <Section title={t("sections.definition")}>
        <p className="leading-relaxed">{note.definition}</p>
      </Section>
      <Section title={t("sections.structure")}>
        <Bullets items={note.structure} />
      </Section>
      <Section title={t("sections.functions")}>
        <Bullets items={note.functions} />
      </Section>
      <Section title={t("sections.neetPoints")}>
        <ul className="space-y-1.5">
          {note.neetPoints.map((point) => (
            <li key={point} className="rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-1.5 leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
      </Section>
      {note.numbers && (
        <Section title={t("sections.numbers")}>
          <Bullets items={note.numbers} />
        </Section>
      )}
      {note.keyTerms && (
        <Section title={t("sections.keyTerms")}>
          <dl className="space-y-1.5">
            {note.keyTerms.map((k) => (
              <div key={k.term}>
                <dt className="font-semibold">{k.term}</dt>
                <dd className="text-muted-foreground">{k.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {note.commonMistakes && (
        <Section title={t("sections.mistakes")}>
          <Bullets items={note.commonMistakes} />
        </Section>
      )}
      {note.disorders && (
        <Section title={t("sections.disorders")}>
          <ul className="space-y-1.5">
            {note.disorders.map((d) => (
              <li key={d.name}>
                <span className="font-semibold">{d.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {d.cause}. {d.symptoms}.
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {note.mnemonic && (
        <Section title={t("sections.mnemonic")}>
          <p className="rounded-lg bg-accent px-3 py-2 text-accent-foreground">{note.mnemonic}</p>
        </Section>
      )}
      <Section title={t("sections.mcqs")}>
        <McqPractice key={note.id} mcqs={note.mcqs} />
      </Section>
    </>
  );
}

interface AtlasDetailsProps {
  catalogue: AtlasCatalogue;
  conceptIndex: number;
  mode: "junior" | "bipc";
}

const noteTargets = new WeakMap<AtlasCatalogue, { note: AtlasNote; index: number; parts: Set<number> }[]>();

/** Smallest noted structure whose pieces include all of `parts`. */
function enclosingNote(catalogue: AtlasCatalogue, parts: number[]) {
  let targets = noteTargets.get(catalogue);
  if (!targets) {
    const byId = new Map(catalogue.concepts.map((c, i) => [c.id, i]));
    targets = ATLAS_NOTES.flatMap((note) => {
      const index = byId.get(note.concepts[0]);
      return index === undefined ? [] : [{ note, index, parts: new Set(catalogue.concepts[index].parts) }];
    });
    noteTargets.set(catalogue, targets);
  }
  let best: (typeof targets)[number] | null = null;
  for (const target of targets) {
    if (target.parts.size <= parts.length || !parts.every((p) => target.parts.has(p))) continue;
    if (!best || target.parts.size < best.parts.size) best = target;
  }
  return best;
}

/** Right-hand (desktop) or bottom (mobile) panel for the selected structure. */
export function AtlasDetails({ catalogue, conceptIndex, mode }: AtlasDetailsProps) {
  const t = useTranslations("Atlas");
  const select = useAtlasStore((s) => s.select);
  const isolate = useAtlasStore((s) => s.isolate);
  const toggleIsolate = useAtlasStore((s) => s.toggleIsolate);
  const concept = catalogue.concepts[conceptIndex];
  const trail = conceptTrail(catalogue, conceptIndex);
  const systems = [...new Set(concept.parts.map((p) => catalogue.parts[p].system))] as AtlasSystemId[];
  const system = systems[0];

  const own = noteForConcept(concept.id);
  // A note on an enclosing structure (e.g. "Heart" for "Left ventricle").
  const enclosing = own ? null : enclosingNote(catalogue, concept.parts);
  const inherited = enclosing?.note;
  const inheritedIndex = enclosing?.index ?? -1;
  const side = /^left\b/i.test(concept.name) ? "sideLeft" : /^right\b/i.test(concept.name) ? "sideRight" : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b p-4">
        <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: ATLAS_SYSTEM[system].color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{systems.map((s) => t(`systemNames.${s}`)).join(" · ")}</p>
          <h2 className="text-xl font-bold leading-tight" tabIndex={-1} id="atlas-detail-title">
            {own?.title ?? concept.name}
          </h2>
          {trail.length > 1 && (
            <nav aria-label={t("partOf")} className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
              {trail.slice(0, -1).map((i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <button type="button" onClick={() => select(i)} className="underline-offset-2 hover:text-foreground hover:underline">
                    {catalogue.concepts[i].name}
                  </button>
                  <ChevronRight className="size-3" aria-hidden="true" />
                </span>
              ))}
            </nav>
          )}
        </div>
        <button type="button" onClick={() => select(null)} aria-label={t("clear")} className="inline-flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b px-4 py-2">
        <button
          type="button"
          onClick={toggleIsolate}
          aria-pressed={isolate}
          className={cn("inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border px-3 text-sm font-semibold hover:bg-muted", isolate && "bg-accent text-accent-foreground")}
        >
          <Focus className="size-4" aria-hidden="true" />
          {isolate ? t("showAll") : t("isolate")}
        </button>
        <span className="inline-flex items-center text-sm text-muted-foreground">{t("madeOf", { count: concept.parts.length })}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 text-sm">
        {own ? (
          <NoteBody note={own} mode={mode} />
        ) : (
          <>
            <p className="mt-3 leading-relaxed">
              {t("autoIntro", { name: concept.name.toLowerCase(), system: t(`systemNames.${system}`).toLowerCase() })}{" "}
              {side && t(side)}
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`systemInfo.${system}`)}</p>
            {inherited && inheritedIndex >= 0 ? (
              <button
                type="button"
                onClick={() => select(inheritedIndex)}
                className="mt-4 w-full rounded-xl border bg-primary/5 p-3 text-left hover:bg-primary/10"
              >
                <span className="block text-xs font-semibold text-muted-foreground">{t("noteFrom", { title: inherited.title })}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 font-semibold text-primary">
                  {t("openNotes")} <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </button>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">{t("noNotes")}</p>
            )}
          </>
        )}
        {system === "reproductive" && <p className="mt-4 text-xs text-muted-foreground">{t("reproductiveNote")}</p>}
        <p className="mt-6 text-[11px] text-muted-foreground">{t("source", { id: concept.id })}</p>
      </div>
    </div>
  );
}
