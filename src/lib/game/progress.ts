import { useCallback, useEffect, useState } from "react";
import { MAP_NODES, NODES_BY_ID, type MapNode } from "./nodes";
import { SKILLS, SKILLS_BY_ID, type Skill } from "./skills";

const STORAGE_KEY = "jp-survival-progress-v1";

export interface ProgressState {
  /** objetivos completados: `${nodeId}:${objectiveId}` -> progreso actual */
  objectiveProgress: Record<string, number>;
  learnedSkills: string[];
  spentPoints: number;
}

const EMPTY: ProgressState = {
  objectiveProgress: {},
  learnedSkills: [],
  spentPoints: 0,
};

export type NodeStatus = "locked" | "available" | "in_progress" | "completed";

export function objectiveKey(nodeId: string, objectiveId: string) {
  return `${nodeId}:${objectiveId}`;
}

export function getObjectiveValue(state: ProgressState, nodeId: string, objId: string) {
  return state.objectiveProgress[objectiveKey(nodeId, objId)] ?? 0;
}

export function isNodeCompleted(state: ProgressState, node: MapNode) {
  return node.objectives.every(
    (o) => getObjectiveValue(state, node.id, o.id) >= o.target,
  );
}

export function nodeStatus(state: ProgressState, node: MapNode): NodeStatus {
  // Todas las zonas desbloqueadas para pruebas
  if (isNodeCompleted(state, node)) return "completed";
  const started = node.objectives.some(
    (o) => getObjectiveValue(state, node.id, o.id) > 0,
  );
  return started ? "in_progress" : "available";
}

export function earnedPoints(state: ProgressState) {
  return MAP_NODES.filter((n) => isNodeCompleted(state, n)).reduce(
    (sum, n) => sum + n.skillPoints,
    0,
  );
}

export function availablePoints(state: ProgressState) {
  return earnedPoints(state) - state.spentPoints;
}

export type SkillStatus = "learned" | "learnable" | "blocked_node" | "blocked_skill" | "no_points";

export function skillStatus(state: ProgressState, skill: Skill): SkillStatus {
  if (state.learnedSkills.includes(skill.id)) return "learned";
  if (skill.unlockedByNode) {
    const node = NODES_BY_ID[skill.unlockedByNode];
    if (!node || !isNodeCompleted(state, node)) return "blocked_node";
  }
  if (!skill.requires.every((r) => state.learnedSkills.includes(r)))
    return "blocked_skill";
  if (availablePoints(state) < skill.cost) return "no_points";
  return "learnable";
}

function load(): ProgressState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return EMPTY;
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const advanceObjective = useCallback(
    (nodeId: string, objectiveId: string, amount = 1) => {
      const node = NODES_BY_ID[nodeId];
      const obj = node?.objectives.find((o) => o.id === objectiveId);
      if (!node || !obj) return;
      setState((prev) => {
        if (nodeStatus(prev, node) === "locked") return prev;
        const key = objectiveKey(nodeId, objectiveId);
        const next = Math.max(0, Math.min(obj.target, (prev.objectiveProgress[key] ?? 0) + amount));
        return {
          ...prev,
          objectiveProgress: { ...prev.objectiveProgress, [key]: next },
        };
      });
    },
    [],
  );

  const completeNode = useCallback((nodeId: string) => {
    const node = NODES_BY_ID[nodeId];
    if (!node) return;
    setState((prev) => {
      if (nodeStatus(prev, node) === "locked") return prev;
      const objectiveProgress = { ...prev.objectiveProgress };
      for (const o of node.objectives) {
        objectiveProgress[objectiveKey(nodeId, o.id)] = o.target;
      }
      return { ...prev, objectiveProgress };
    });
  }, []);

  const learnSkill = useCallback((skillId: string) => {
    const skill = SKILLS_BY_ID[skillId];
    if (!skill) return;
    setState((prev) => {
      if (skillStatus(prev, skill) !== "learnable") return prev;
      return {
        ...prev,
        learnedSkills: [...prev.learnedSkills, skill.id],
        spentPoints: prev.spentPoints + skill.cost,
      };
    });
  }, []);

  const unlockAndCompleteAll = useCallback(() => {
    setState((prev) => {
      const objectiveProgress: Record<string, number> = {};
      for (const n of MAP_NODES) {
        for (const o of n.objectives) {
          objectiveProgress[objectiveKey(n.id, o.id)] = o.target;
        }
      }
      return { ...prev, objectiveProgress };
    });
  }, []);

  const resetProgress = useCallback(() => setState(EMPTY), []);

  return {
    state,
    hydrated,
    advanceObjective,
    completeNode,
    unlockAndCompleteAll,
    learnSkill,
    resetProgress,
    nodes: MAP_NODES,
    skills: SKILLS,
  };
}
