import { getModelNode, MODEL_NODES } from "@/lib/model-index";
import { nodeStyle, viewForNode, type ViewId } from "@/lib/views";
import type { AgeMode, BodyPart, JuniorContent } from "@/types/content";
import circulatory from "@content/parts/circulatory.json";
import digestive from "@content/parts/digestive.json";
import endocrine from "@content/parts/endocrine.json";
import external from "@content/parts/external.json";
import immune from "@content/parts/immune.json";
import integumentary from "@content/parts/integumentary.json";
import muscular from "@content/parts/muscular.json";
import nervous from "@content/parts/nervous.json";
import respiratory from "@content/parts/respiratory.json";
import sensory from "@content/parts/sensory.json";
import skeletal from "@content/parts/skeletal.json";
import urinary from "@content/parts/urinary.json";

/**
 * Content loader for body parts. All part data lives in /content/parts/*.json;
 * this module validates it once at load time and exposes typed helpers.
 */

// JSON imports widen tuples to number[], so we cast and validate at runtime.
const RAW_PARTS = [
  ...external,
  ...integumentary,
  ...sensory,
  ...nervous,
  ...skeletal,
  ...muscular,
  ...circulatory,
  ...respiratory,
  ...digestive,
  ...urinary,
  ...immune,
  ...endocrine,
] as unknown as BodyPart[];

const partNodes = (part: BodyPart) => [part.meshName, ...(part.meshNames ?? [])];

/** Throws a descriptive error if the content breaks any rule. */
export function validateParts(parts: readonly BodyPart[]): void {
  const ids = new Set<string>();
  const primaryMeshes = new Set<string>();

  for (const part of parts) {
    if (ids.has(part.id)) throw new Error(`Duplicate part id "${part.id}"`);
    ids.add(part.id);
    if (primaryMeshes.has(part.meshName)) throw new Error(`Duplicate meshName "${part.meshName}"`);
    primaryMeshes.add(part.meshName);
    for (const node of partNodes(part)) {
      if (!MODEL_NODES[node]) throw new Error(`Part "${part.id}" uses unknown mesh node "${node}"`);
    }
  }

  for (const part of parts) {
    for (const mode of part.visibleInModes) {
      const hasContent = mode === "bipc" ? Boolean(part.content.bipc ?? part.content.junior) : Boolean(part.content[mode]);
      if (!hasContent) throw new Error(`Part "${part.id}" is visible in "${mode}" but has no ${mode} content`);
    }
    // Section 15: reproductive content is BiPC-only, always.
    if (part.system === "reproductive" && part.visibleInModes.some((mode) => mode !== "bipc")) {
      throw new Error(`Reproductive part "${part.id}" must only be visible in bipc mode`);
    }
    const refs = [...(part.parentId ? [part.parentId] : []), ...(part.children ?? []), ...(part.content.junior?.worksWith ?? [])];
    for (const ref of refs) {
      if (!ids.has(ref)) throw new Error(`Part "${part.id}" references unknown part "${ref}"`);
    }
  }
}

validateParts(RAW_PARTS);

export const ALL_PARTS: readonly BodyPart[] = RAW_PARTS;

const PARTS_BY_ID = new Map(RAW_PARTS.map((part) => [part.id, part]));
const PARTS_BY_PRIMARY_MESH = new Map(RAW_PARTS.map((part) => [part.meshName, part]));
const PARTS_BY_ALIAS = new Map<string, BodyPart[]>();
for (const part of RAW_PARTS) {
  for (const node of part.meshNames ?? []) {
    PARTS_BY_ALIAS.set(node, [...(PARTS_BY_ALIAS.get(node) ?? []), part]);
  }
}

export function getPart(id: string): BodyPart | undefined {
  return PARTS_BY_ID.get(id);
}

export function isPartVisible(part: BodyPart, mode: AgeMode): boolean {
  return part.visibleInModes.includes(mode);
}

export function getPartsForMode(mode: AgeMode): BodyPart[] {
  return RAW_PARTS.filter((part) => isPartVisible(part, mode));
}

/**
 * The part a mesh node selects in this mode: the part whose primary mesh it
 * is, otherwise a part that lists it in `meshNames` (e.g. skin regions fall
 * back to "Skin" when "Head" isn't shown in the current mode).
 */
export function resolvePartForNode(nodeName: string, mode: AgeMode): BodyPart | undefined {
  const primary = PARTS_BY_PRIMARY_MESH.get(nodeName);
  if (primary && isPartVisible(primary, mode)) return primary;
  return PARTS_BY_ALIAS.get(nodeName)?.find((part) => isPartVisible(part, mode));
}

/** Parts that can be selected in the given view and mode. */
export function getPartsInView(mode: AgeMode, view: ViewId): BodyPart[] {
  return getPartsForMode(mode).filter((part) =>
    partNodes(part).some((name) => {
      const node = MODEL_NODES[name];
      return nodeStyle(node, view) === "solid" && resolvePartForNode(name, mode)?.id === part.id;
    }),
  );
}

/** View in which a part is shown solid. */
export function viewForPart(part: BodyPart): ViewId {
  return viewForNode(MODEL_NODES[part.meshName]);
}

export function isPartSolidInView(part: BodyPart, view: ViewId): boolean {
  return partNodes(part).some((name) => nodeStyle(MODEL_NODES[name], view) === "solid");
}

/** Mesh node used for framing and labels. */
export function getPartNode(part: BodyPart) {
  return getModelNode(part.meshName);
}

/** Visible ancestors, outermost first (for breadcrumbs). */
export function getAncestors(part: BodyPart, mode: AgeMode): BodyPart[] {
  const chain: BodyPart[] = [];
  let current = part.parentId ? getPart(part.parentId) : undefined;
  while (current) {
    if (isPartVisible(current, mode)) chain.unshift(current);
    current = current.parentId ? getPart(current.parentId) : undefined;
  }
  return chain;
}

/** Name shown on labels, e.g. "Femur – thigh bone" in Junior Doctors mode. */
export function getDisplayName(part: BodyPart, mode: AgeMode): string {
  const { common, scientific } = part.names;
  if (!scientific) return common;
  if (mode === "junior") return `${scientific} – ${common.toLowerCase()}`;
  if (mode === "bipc") return scientific;
  return common;
}

/** Junior content, used by BiPC mode until detailed BiPC notes exist. */
export function getBipcFallback(part: BodyPart): JuniorContent | undefined {
  return part.content.bipc ? undefined : part.content.junior;
}

/** Short plain-text summary (metadata descriptions). */
export function getSummary(part: BodyPart): string {
  const { young, junior, little } = part.content;
  return young ? `${young.what} ${young.does}` : junior ? `${junior.what} ${junior.does}` : (little?.say ?? part.names.common);
}

/** Text read aloud by the speak button for the given mode. */
export function getSpeechText(part: BodyPart, mode: AgeMode): string {
  const name = getDisplayName(part, mode);
  const { little, young, junior, bipc } = part.content;
  switch (mode) {
    case "little":
      return little?.say ?? name;
    case "young":
      return young ? `${name}. ${young.what} ${young.does}` : name;
    case "junior":
      return junior ? `${name}. ${junior.what} ${junior.does}` : name;
    case "bipc":
      if (bipc) return `${name}. ${bipc.definition}`;
      return junior ? `${name}. ${junior.what} ${junior.does}` : name;
  }
}
