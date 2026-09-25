"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Confetti } from "@/components/ui/Confetti";
import { Link } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { playSound } from "@/lib/audio";
import { getDisplayName, getPart } from "@/lib/parts";
import { useProgressStore } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";

type Kind = "skull" | "ribs" | "spine" | "pelvis" | "humerus" | "femur" | "tibia";

const KIND_PART: Record<Kind, string> = {
  skull: "skull",
  ribs: "rib-cage",
  spine: "vertebral-column",
  pelvis: "pelvis",
  humerus: "humerus",
  femur: "femur",
  tibia: "tibia",
};

interface Slot {
  id: string;
  kind: Kind;
  /** Position/size in the 240 × 520 body layout. */
  x: number;
  y: number;
  w: number;
  h: number;
  side?: "left" | "right";
}

// Viewer's left is the body's right side.
const SLOTS: Slot[] = [
  { id: "skull", kind: "skull", x: 90, y: 6, w: 60, h: 62 },
  { id: "ribs", kind: "ribs", x: 72, y: 86, w: 96, h: 84 },
  { id: "spine", kind: "spine", x: 110, y: 174, w: 20, h: 52 },
  { id: "pelvis", kind: "pelvis", x: 74, y: 228, w: 92, h: 50 },
  { id: "humerus-r", kind: "humerus", x: 42, y: 92, w: 22, h: 110, side: "right" },
  { id: "humerus-l", kind: "humerus", x: 176, y: 92, w: 22, h: 110, side: "left" },
  { id: "femur-r", kind: "femur", x: 86, y: 282, w: 24, h: 116, side: "right" },
  { id: "femur-l", kind: "femur", x: 130, y: 282, w: 24, h: 116, side: "left" },
  { id: "tibia-r", kind: "tibia", x: 88, y: 404, w: 22, h: 106, side: "right" },
  { id: "tibia-l", kind: "tibia", x: 130, y: 404, w: 22, h: 106, side: "left" },
];

/** Tray order is mixed up relative to the body so it's a real puzzle. */
const PIECES = ["femur-l", "skull", "humerus-r", "pelvis", "tibia-l", "ribs", "femur-r", "spine", "tibia-r", "humerus-l"].map((slotId) => {
  const slot = SLOTS.find((s) => s.id === slotId)!;
  return { id: `piece-${slotId}`, kind: slot.kind };
});

const BONE = { fill: "#efe6d0", stroke: "#8f7f5c", strokeWidth: 2 } as const;

/** Simple, friendly bone drawings (original artwork). */
function BoneShape({ kind, className }: { kind: Kind; className?: string }) {
  const common = { className, "aria-hidden": true, preserveAspectRatio: "xMidYMid meet" } as const;
  switch (kind) {
    case "skull":
      return (
        <svg viewBox="0 0 60 62" {...common}>
          <path d="M30 2C12 2 4 16 4 30c0 10 5 16 10 18l2 10h28l2-10c5-2 10-8 10-18C56 16 48 2 30 2Z" {...BONE} />
          <circle cx="21" cy="30" r="6" fill="#5b4a33" />
          <circle cx="39" cy="30" r="6" fill="#5b4a33" />
          <path d="M30 36l-3 7h6z" fill="#5b4a33" />
          <path d="M20 52h20M25 49v6M30 49v6M35 49v6" stroke="#8f7f5c" strokeWidth="1.5" />
        </svg>
      );
    case "ribs":
      return (
        <svg viewBox="0 0 96 84" {...common}>
          <rect x="44" y="4" width="8" height="56" rx="3" {...BONE} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} fill="none" stroke="#8f7f5c" strokeWidth="5" strokeLinecap="round">
              <path d={`M44 ${10 + i * 10}C22 ${6 + i * 10} 8 ${20 + i * 10} 12 ${34 + i * 8}`} />
              <path d={`M52 ${10 + i * 10}C74 ${6 + i * 10} 88 ${20 + i * 10} 84 ${34 + i * 8}`} />
            </g>
          ))}
        </svg>
      );
    case "spine":
      return (
        <svg viewBox="0 0 20 52" {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x="3" y={1 + i * 8.5} width="14" height="7" rx="2.5" {...BONE} />
          ))}
        </svg>
      );
    case "pelvis":
      return (
        <svg viewBox="0 0 92 50" {...common}>
          <path d="M46 30C36 10 14 2 4 10c-2 16 12 30 26 34l8 4h16l8-4c14-4 28-18 26-34C78 2 56 10 46 30Z" {...BONE} />
          <circle cx="34" cy="36" r="5" fill="#5b4a33" />
          <circle cx="58" cy="36" r="5" fill="#5b4a33" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 110" {...common}>
          <rect x="8" y="10" width="8" height="90" rx="3" {...BONE} />
          <circle cx="7" cy="9" r="6" {...BONE} />
          <circle cx="17" cy="9" r="6" {...BONE} />
          <circle cx="7" cy="101" r="6" {...BONE} />
          <circle cx="17" cy="101" r="6" {...BONE} />
        </svg>
      );
  }
}

function useBoneName(mode: AgeMode) {
  return (kind: Kind) => {
    const part = getPart(KIND_PART[kind]);
    return part ? getDisplayName(part, mode) : kind;
  };
}

function Piece({ id, kind, name, selected, onSelect }: { id: string; kind: Kind; name: string; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={name}
      className={cn(
        "flex w-28 shrink-0 touch-pan-x flex-col items-center gap-1 rounded-2xl border-2 bg-card p-2 font-semibold shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
        selected && "border-primary ring-4 ring-primary/30",
        isDragging && "opacity-40",
      )}
    >
      <BoneShape kind={kind} className="h-16 w-full" />
      <span className="text-center text-sm leading-tight">{name}</span>
    </button>
  );
}

function SlotTarget({ slot, filled, label, onPlace }: { slot: Slot; filled: boolean; label: string; onPlace: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, disabled: filled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onPlace}
      disabled={filled}
      aria-label={label}
      className={cn(
        "absolute flex items-center justify-center rounded-xl",
        filled ? "" : "border-2 border-dashed border-primary/60 bg-primary/10 motion-safe:animate-pulse",
        isOver && "border-solid bg-primary/25",
      )}
      style={{ left: `${(slot.x / 240) * 100}%`, top: `${(slot.y / 520) * 100}%`, width: `${(slot.w / 240) * 100}%`, height: `${(slot.h / 520) * 100}%` }}
    >
      {filled && <BoneShape kind={slot.kind} className="h-full w-full" />}
    </button>
  );
}

/** "Build a Skeleton": drag (or tap, then tap a spot) each bone into place. */
export function BuildSkeleton({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Skeleton");
  const tGames = useTranslations("Games");
  const locale = useLocale();
  const boneName = useBoneName(mode);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState(t("instructions"));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const used = new Set(Object.values(placed));
  const tray = PIECES.filter((p) => !used.has(p.id));
  const done = tray.length === 0;
  const rate = AGE_MODE_CONFIG[mode].speechRate;

  const tryPlace = (pieceId: string, slotId: string) => {
    const piece = PIECES.find((p) => p.id === pieceId);
    const slot = SLOTS.find((s) => s.id === slotId);
    if (!piece || !slot || placed[slot.id]) return;
    const name = boneName(piece.kind);
    if (piece.kind === slot.kind) {
      const next = { ...placed, [slot.id]: piece.id };
      setPlaced(next);
      setSelected(null);
      if (Object.keys(next).length === SLOTS.length) {
        playSound("sticker");
        setMessage(t("done"));
        void speak(t("done"), { locale, rate });
        useProgressStore.getState().recordEvent("skeleton-complete", mode);
      } else {
        playSound("success");
        setMessage(t("placed", { name }));
      }
    } else {
      setSelected(null);
      playSound("try");
      setMessage(t("wrong", { name }));
      void speak(t("wrong", { name }), { locale, rate });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActive(null);
    if (event.over) tryPlace(String(event.active.id), String(event.over.id));
  };

  const activePiece = PIECES.find((p) => p.id === active);

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActive(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <Confetti burst={done ? 777 : 0} />
      <p role="status" aria-live="polite" className="mx-auto mb-4 max-w-xl rounded-2xl bg-secondary px-4 py-3 text-center text-lg font-semibold text-secondary-foreground">
        {message}
      </p>
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
        <div className="relative aspect-[240/520] w-full max-w-[280px]">
          {/* Body outline */}
          <svg viewBox="0 0 240 520" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g fill="#e3e6fb" stroke="#c3c8ef" strokeWidth="2">
              <circle cx="120" cy="38" r="36" />
              <rect x="66" y="78" width="108" height="206" rx="40" />
              <rect x="34" y="84" width="34" height="200" rx="16" />
              <rect x="172" y="84" width="34" height="200" rx="16" />
              <rect x="78" y="270" width="40" height="244" rx="18" />
              <rect x="122" y="270" width="40" height="244" rx="18" />
            </g>
          </svg>
          {SLOTS.map((slot) => {
            const name = boneName(slot.kind);
            const label = slot.side ? `${t("slot", { name })} (${t(slot.side)})` : t("slot", { name });
            return (
              <SlotTarget
                key={slot.id}
                slot={slot}
                filled={Boolean(placed[slot.id])}
                label={label}
                onPlace={() => selected && tryPlace(selected, slot.id)}
              />
            );
          })}
        </div>

        <section
          aria-label={t("tray")}
          className={cn(
            "w-full md:max-w-md",
            done
              ? "max-w-md"
              : "sticky bottom-0 z-10 -mx-4 w-[calc(100%+2rem)] border-t bg-background/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:w-full md:border-0 md:bg-transparent md:p-0",
          )}
        >
          {done ? (
            <div className="rounded-3xl border-2 bg-card p-5 text-center">
              <p className="text-3xl font-bold">🎉 {t("done")}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlaced({});
                    setMessage(t("instructions"));
                  }}
                  className="min-h-[var(--tap)] rounded-full bg-primary px-6 font-bold text-primary-foreground hover:brightness-110"
                >
                  🔁 {tGames("playAgain")}
                </button>
                <Link href="/explore/skeletal" className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 px-6 font-semibold hover:bg-muted">
                  🦴 {t("explore")}
                </Link>
                <Link href="/games" className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 px-6 font-semibold hover:bg-muted">
                  {tGames("backToGames")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible">
              {tray.map((piece) => (
                <Piece
                  key={piece.id}
                  id={piece.id}
                  kind={piece.kind}
                  name={boneName(piece.kind)}
                  selected={selected === piece.id}
                  onSelect={() => setSelected((s) => (s === piece.id ? null : piece.id))}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      <DragOverlay>{activePiece && <BoneShape kind={activePiece.kind} className="h-24 w-24 drop-shadow-xl" />}</DragOverlay>
    </DndContext>
  );
}
