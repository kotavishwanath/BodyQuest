"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { SENSE_DEMOS } from "@/components/demos/SenseDemos";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { canSeeTissue, getTissue, microText, tissueForPart } from "@/lib/micro";
import { getBipcFallback, getDisplayName, getPart, getSpeechText, isPartVisible } from "@/lib/parts";
import { speak, stopSpeaking } from "@/lib/speech";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgeMode, BipcContent, BodyPart, JuniorContent } from "@/types/content";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{title}</h3>
      <div className="mt-1 leading-relaxed">{children}</div>
    </section>
  );
}

function RelatedParts({ ids, mode, title }: { ids: string[]; mode: AgeMode; title: string }) {
  const focusPart = useAppStore((s) => s.focusPart);
  const related = ids
    .map((id) => getPart(id))
    .filter((p): p is BodyPart => p !== undefined && isPartVisible(p, mode));
  if (related.length === 0) return null;

  return (
    <Section title={title}>
      <ul className="flex flex-wrap gap-2">
        {related.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => focusPart(p.id)}
              className="min-h-[var(--tap)] rounded-full border-2 bg-muted px-4 font-semibold hover:bg-accent"
            >
              {p.icon && <span aria-hidden="true">{p.icon} </span>}
              {getDisplayName(p, mode)}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function BipcDetails({ bipc }: { bipc: BipcContent }) {
  const t = useTranslations("Panel");
  const tBoards = useTranslations("Boards");

  return (
    <>
      <Section title={t("definition")}>
        <p>{bipc.definition}</p>
      </Section>
      <Section title={t("structure")}>
        <p>{bipc.structure}</p>
      </Section>
      <Section title={t("function")}>
        <p>{bipc.function}</p>
      </Section>
      <Section title={t("keyTerms")}>
        <dl className="space-y-1">
          {bipc.keyTerms.map((k) => (
            <div key={k.term}>
              <dt className="inline font-semibold">{k.term}: </dt>
              <dd className="inline">{k.meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title={t("syllabus")}>
        {bipc.syllabusRefs.length === 0 ? (
          <p className="text-muted-foreground">{t("syllabusPending")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {bipc.syllabusRefs.map((ref) => (
              <li
                key={`${ref.board}-${ref.chapter}-${ref.topic}`}
                className="rounded-md border bg-muted px-2 py-1 text-sm"
              >
                <span className="font-semibold">{tBoards(ref.board)}</span> ·{" "}
                {t("classLabel", { class: ref.class })} · {ref.topic}
                {!ref.inSyllabus && (
                  <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                    {t("notInSyllabus")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {bipc.physicsLinks?.map((link) => (
        <Section key={link.concept} title={`🔗 ${t("physicsLink")}`}>
          <p className="font-semibold">{link.concept}</p>
          <p>{link.explanation}</p>
        </Section>
      ))}
      {bipc.chemistryLinks?.map((link) => (
        <Section key={link.concept} title={`⚗️ ${t("chemistryLink")}`}>
          <p className="font-semibold">{link.concept}</p>
          <p>{link.explanation}</p>
        </Section>
      ))}
      {bipc.examTips && bipc.examTips.length > 0 && (
        <Section title={t("examTips")}>
          <ul className="list-disc space-y-1 pl-5">
            {bipc.examTips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </Section>
      )}
      {bipc.commonMistakes && bipc.commonMistakes.length > 0 && (
        <Section title={t("commonMistakes")}>
          <ul className="list-disc space-y-1 pl-5">
            {bipc.commonMistakes.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Section>
      )}
      {bipc.mnemonics && bipc.mnemonics.length > 0 && (
        <Section title={t("mnemonics")}>
          <ul className="list-disc space-y-1 pl-5">
            {bipc.mnemonics.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Section>
      )}
    </>
  );
}

/** Level 2–4 tools: close-up, cut in half, zoom into the tissue. */
function LookInside({ part, mode }: { part: BodyPart; mode: AgeMode }) {
  const t = useTranslations("Actions");
  const closeUp = useAppStore((s) => s.closeUp);
  const cut = useAppStore((s) => s.cut);
  const cutDepth = useAppStore((s) => s.cutDepth);
  const toggleCloseUp = useAppStore((s) => s.toggleCloseUp);
  const toggleCut = useAppStore((s) => s.toggleCut);
  const setCutDepth = useAppStore((s) => s.setCutDepth);
  const openMicro = useAppStore((s) => s.openMicro);
  const tissue = tissueForPart(part);
  const button =
    "inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border-2 px-4 font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50";

  return (
    <Section title={`🔎 ${t("lookInside")}`}>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={closeUp} onClick={toggleCloseUp} className={cn(button, closeUp && "border-primary")}>
          {closeUp ? `🧍 ${t("exitCloseUp")}` : `🔍 ${t("closeUp")}`}
        </button>
        <button type="button" aria-pressed={cut} onClick={toggleCut} className={cn(button, cut && "border-primary")}>
          {cut ? `🩹 ${t("uncut")}` : `✂️ ${t("cut")}`}
        </button>
        {tissue && canSeeTissue(mode) && (
          <button type="button" onClick={() => openMicro({ tissue, level: "tissue" })} className={button}>
            🔬 {t("tissue")}: {microText(getTissue(tissue).name, mode)}
          </button>
        )}
      </div>
      {cut && (
        <label className="mt-2 block text-sm font-semibold">
          {t("cutDepth")}
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={cutDepth}
            onChange={(e) => setCutDepth(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </label>
      )}
    </Section>
  );
}

function SenseDemo({ part }: { part: BodyPart }) {
  const t = useTranslations("Demos");
  const Demo = SENSE_DEMOS[part.id];
  if (!Demo) return null;
  return (
    <Section title={`🧪 ${t("title")}`}>
      <div className="rounded-2xl border-2 border-dashed p-3">
        <Demo />
      </div>
    </Section>
  );
}

function JuniorBody({ part, junior, mode }: { part: BodyPart; junior: JuniorContent; mode: AgeMode }) {
  const t = useTranslations("Panel");
  return (
    <>
      <Section title={t("whatIsIt")}><p>{junior.what}</p></Section>
      <Section title={t("whatDoesItDo")}><p>{junior.does}</p></Section>
      <Section title={t("didYouKnow")}><p>{junior.details}</p></Section>
      <Section title={`⭐ ${t("funFact")}`}><p>{junior.funFact}</p></Section>
      {mode === "junior" && (
        <p className="mt-4 rounded-2xl bg-secondary p-3 text-secondary-foreground">
          👉 {t("whereOnYou", { name: part.names.common.toLowerCase() })}
        </p>
      )}
      <RelatedParts ids={part.children ?? []} mode={mode} title={`🔍 ${t("lookCloser")}`} />
      <RelatedParts ids={junior.worksWith} mode={mode} title={t("worksWith")} />
    </>
  );
}

function PanelBody({ part, mode }: { part: BodyPart; mode: AgeMode }) {
  const t = useTranslations("Panel");
  const { little, young, junior, bipc } = part.content;

  switch (mode) {
    case "little":
      return little ? <p className="mt-3 text-2xl leading-snug">{little.say}</p> : null;
    case "young":
      return young ? (
        <>
          <Section title={t("whatIsIt")}><p className="text-lg">{young.what}</p></Section>
          <Section title={t("whatDoesItDo")}><p className="text-lg">{young.does}</p></Section>
          <Section title={`⭐ ${t("funFact")}`}><p className="text-lg">{young.funFact}</p></Section>
          <p className="mt-4 rounded-2xl bg-secondary p-3 text-lg text-secondary-foreground">
            👉 {t("whereOnYou", { name: part.names.common.toLowerCase() })}
          </p>
          <RelatedParts ids={part.children ?? []} mode={mode} title={`🔍 ${t("lookCloser")}`} />
        </>
      ) : null;
    case "junior":
      return junior ? <JuniorBody part={part} junior={junior} mode={mode} /> : null;
    case "bipc": {
      if (bipc) {
        return (
          <>
            <BipcDetails bipc={bipc} />
            <RelatedParts ids={part.children ?? []} mode={mode} title={`🔍 ${t("lookCloser")}`} />
            <RelatedParts ids={junior?.worksWith ?? []} mode={mode} title={t("worksWith")} />
          </>
        );
      }
      const fallback = getBipcFallback(part);
      return fallback ? (
        <>
          <p className="mt-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t("bipcPending")}</p>
          <JuniorBody part={part} junior={fallback} mode={mode} />
        </>
      ) : null;
    }
  }
}

/** Side panel (desktop) / bottom sheet (mobile) for the selected part. */
export function InfoPanel({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Common");
  const tPanel = useTranslations("Panel");
  const locale = useLocale();
  const selectedId = useAppStore((s) => s.selectedPartId);
  const focusPart = useAppStore((s) => s.focusPart);
  const covered = useAppStore((s) => s.journey !== null || s.micro !== null);

  const found = selectedId ? getPart(selectedId) : undefined;
  const part = found && isPartVisible(found, mode) && !covered ? found : undefined;
  const config = AGE_MODE_CONFIG[mode];

  // Pre-readers hear the part's sentence automatically when they tap it.
  useEffect(() => {
    if (!part || !config.autoSpeak) return;
    void speak(getSpeechText(part, mode), { locale, rate: config.speechRate });
    return stopSpeaking;
  }, [part, mode, locale, config]);

  // Esc closes the panel from anywhere on the page.
  useEffect(() => {
    if (!part) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") focusPart(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [part, focusPart]);

  return (
    <AnimatePresence>
      {part && (
        <motion.aside
          key={part.id}
          aria-labelledby="info-panel-title"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "absolute inset-x-2 bottom-2 z-20 max-h-[62%] overflow-y-auto rounded-3xl border-2 bg-card p-5 text-card-foreground shadow-2xl",
            "lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[420px]",
          )}
        >
          <div className="flex items-start gap-3">
            {part.icon && (
              <span className={mode === "little" ? "text-6xl" : "text-4xl"} aria-hidden="true">
                {part.icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2
                id="info-panel-title"
                className={cn("font-bold leading-tight", mode === "little" ? "text-4xl" : "text-2xl")}
              >
                {getDisplayName(part, mode)}
              </h2>
              {mode !== "little" && part.names.scientific && mode !== "bipc" && mode !== "junior" && (
                <p className="text-muted-foreground">{part.names.scientific}</p>
              )}
              {(mode === "junior" || mode === "bipc") && part.names.pronunciation && (
                <p className="text-sm text-muted-foreground">
                  {tPanel("sayIt", { pronunciation: part.names.pronunciation })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => focusPart(null)}
              aria-label={t("close")}
              className="inline-flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full border-2 hover:bg-muted"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3">
            <SpeakButton
              text={getSpeechText(part, mode)}
              rate={config.speechRate}
              className={mode === "little" ? "px-8 text-2xl" : undefined}
            />
          </div>

          <PanelBody part={part} mode={mode} />
          <SenseDemo part={part} />
          {mode !== "little" && <LookInside part={part} mode={mode} />}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
