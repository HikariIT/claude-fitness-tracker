export type ActionResult<T, E extends string = string> =
  | { ok: true; data: T }
  | { ok: false; code: "validation" | "unexpected"; fieldErrors?: Partial<Record<string, E>> };
