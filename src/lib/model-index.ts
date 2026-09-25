import index from "@/generated/model-index.json";
import type { SystemId, Vec3 } from "@/types/content";

/**
 * Typed access to src/generated/model-index.json, which is written by
 * `npm run models` (scripts/build-models.mjs). Do not edit that JSON by hand.
 */

export const RENDER_GROUPS = ["skin", "muscles", "organs", "skeleton"] as const;
export type RenderGroup = (typeof RENDER_GROUPS)[number];

export type ModelFile = keyof typeof index.files;

export interface ModelNode {
  file: ModelFile;
  group: RenderGroup;
  system: SystemId;
  /** Primary system plus any other system views that show this node. */
  systems: SystemId[];
  color: string;
  /** Preferred side for the camera when flying to this node. */
  view: "front" | "back" | "side";
  center: Vec3;
  radius: number;
}

export const MODEL_FILES: Record<ModelFile, string> = index.files;
export const MODEL_NODES = index.nodes as unknown as Record<string, ModelNode>;
export const MODEL_SOURCE = index.source;
/** Schematic path a nerve "message" travels: brain → spinal cord → right hand. */
export const SIGNAL_PATH = index.paths.signal as Vec3[];

export function getModelNode(name: string): ModelNode | undefined {
  return MODEL_NODES[name];
}

/** Node names contained in one GLB file, in a stable order. */
export function nodesInFile(file: ModelFile): string[] {
  return Object.keys(MODEL_NODES).filter((name) => MODEL_NODES[name].file === file);
}
