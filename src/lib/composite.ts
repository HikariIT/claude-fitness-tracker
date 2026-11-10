/** Nutrition values per 100 g. */
export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number };
/** One ingredient: its per-100 g values plus the grams used in the dish. */
export type ComponentPortion = Nutrition & { quantityG: number };

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Sum of quantityG over all portions. */
export function totalQuantity(components: readonly ComponentPortion[]): number {
  return components.reduce((sum, component) => sum + component.quantityG, 0);
}

/**
 * Per-100 g values of a dish (D2).
 * absolute_x = Σ x_i · quantityG_i / 100; totalG = finalWeightG ?? totalQuantity(components);
 * result_x = absolute_x / totalG · 100, rounded to 2 decimals (Math.round(v * 100) / 100).
 * Empty list or totalG <= 0 → all zeros.
 */
export function compositeNutrition(
  components: readonly ComponentPortion[],
  finalWeightG: number | null,
): Nutrition {
  const totalG = finalWeightG ?? totalQuantity(components);
  if (components.length === 0 || totalG <= 0) {
    return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }

  const absolute = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const component of components) {
    const factor = component.quantityG / 100;
    absolute.kcal += component.kcal * factor;
    absolute.proteinG += component.proteinG * factor;
    absolute.carbsG += component.carbsG * factor;
    absolute.fatG += component.fatG * factor;
  }

  const per100 = 100 / totalG;
  return {
    kcal: round2(absolute.kcal * per100),
    proteinG: round2(absolute.proteinG * per100),
    carbsG: round2(absolute.carbsG * per100),
    fatG: round2(absolute.fatG * per100),
  };
}

/**
 * D3: true when `parentId` would (transitively) contain itself if its components were `componentIds`.
 * `graph` maps a dish id → its component ids, for every OTHER dish (the caller leaves out parentId's old edges).
 * Cycle if parentId ∈ componentIds, or parentId is reachable from any componentId by following `graph`.
 * Iterative DFS with a visited set. Ids missing from `graph` are plain foods (no children).
 */
export function wouldCreateCycle(
  parentId: number,
  componentIds: readonly number[],
  graph: ReadonlyMap<number, readonly number[]>,
): boolean {
  if (componentIds.includes(parentId)) return true;

  const visited = new Set<number>();
  const stack = [...componentIds];
  while (stack.length > 0) {
    const id = stack.pop() as number;
    if (id === parentId) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const child of graph.get(id) ?? []) {
      stack.push(child);
    }
  }
  return false;
}

/**
 * D4: ids of every dish that (transitively) contains `changedId`, in an order where each dish comes
 * AFTER every affected dish it contains, so recalculating them in this order uses fresh values.
 * `usedBy` maps a food id → ids of dishes that list it as a component.
 * Algorithm: DFS from changedId over usedBy, push to `post` in post-order, reverse `post`, drop changedId.
 * Each id appears once. Unknown changedId or no users → [].
 */
export function dependentsInOrder(
  changedId: number,
  usedBy: ReadonlyMap<number, readonly number[]>,
): number[] {
  const visited = new Set<number>([changedId]);
  const post: number[] = [];

  // Iterative post-order DFS: each frame is [id, index of next child to visit].
  const stack: Array<[number, number]> = [[changedId, 0]];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const children = usedBy.get(frame[0]) ?? [];
    if (frame[1] < children.length) {
      const child = children[frame[1]];
      frame[1] += 1;
      if (!visited.has(child)) {
        visited.add(child);
        stack.push([child, 0]);
      }
    } else {
      post.push(frame[0]);
      stack.pop();
    }
  }

  return post.reverse().filter((id) => id !== changedId);
}
