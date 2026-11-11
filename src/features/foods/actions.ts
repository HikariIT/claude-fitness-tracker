"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import {
  parseFoodForm,
  parseFoodId,
  type FoodErrorCode,
  type FoodFormErrorCode,
} from "@/lib/validation/foods";
import {
  parseCompositeFoodForm,
  type CompositeFoodErrorCode,
} from "@/lib/validation/composite-foods";
import {
  foodImportErrorKey,
  parseFoodImport,
  type FoodImportErrorCode,
} from "@/lib/validation/food-imports";
import {
  archiveFood,
  importFoods,
  createCompositeFood,
  createFood,
  deleteFood,
  restoreFood,
  updateCompositeFood,
  updateFood,
} from "@/server/services/foods";

export type FoodFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, FoodFormErrorCode>
  | null;
export type CompositeFoodFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, CompositeFoodErrorCode>
  | null;
export type FoodRowActionResult = ActionResult<null, FoodErrorCode>;

/** useActionState action for the add/edit dialog. Hidden field "id": empty → create, else update. */
export async function saveFood(
  _prev: FoodFormState,
  formData: FormData,
): Promise<FoodFormState> {
  const rawId = formData.get("id");
  let id: number | null = null;
  if (typeof rawId === "string" && rawId !== "") {
    id = parseFoodId(rawId);
    if (id === null) return { ok: false, code: "unexpected" };
  }

  const parsed = parseFoodForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  const mode = id === null ? "created" : "updated";
  try {
    const result =
      id === null ? await createFood(parsed.data) : await updateFood(id, parsed.data);
    if (!result.ok) {
      if (result.reason === "nameTaken") {
        return { ok: false, code: "validation", fieldErrors: { name: "nameTaken" } };
      }
      return { ok: false, code: "unexpected" };
    }
  } catch (error) {
    console.error("saveFood failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag("foods");
  return { ok: true, data: { savedAt: Date.now(), mode } };
}

/** useActionState action for the dish dialog. Hidden field "id": empty → create, else update. */
export async function saveCompositeFood(
  _prev: CompositeFoodFormState,
  formData: FormData,
): Promise<CompositeFoodFormState> {
  const rawId = formData.get("id");
  let id: number | null = null;
  if (typeof rawId === "string" && rawId !== "") {
    id = parseFoodId(rawId);
    if (id === null) return { ok: false, code: "unexpected" };
  }

  const parsed = parseCompositeFoodForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  const mode = id === null ? "created" : "updated";
  try {
    const result =
      id === null
        ? await createCompositeFood(parsed.data)
        : await updateCompositeFood(id, parsed.data);
    if (!result.ok) {
      if (result.reason === "nameTaken") {
        return { ok: false, code: "validation", fieldErrors: { name: "nameTaken" } };
      }
      if (
        result.reason === "componentUnavailable" ||
        result.reason === "componentPortionUnavailable" ||
        result.reason === "componentGramsRange"
      ) {
        return {
          ok: false,
          code: "validation",
          fieldErrors: { components: result.reason },
        };
      }
      if (result.reason === "componentCycle") {
        return { ok: false, code: "validation", fieldErrors: { components: "componentCycle" } };
      }
      if (result.reason === "finalWeightTooLow") {
        return {
          ok: false,
          code: "validation",
          fieldErrors: { finalWeightG: "finalWeightTooLow" },
        };
      }
      return { ok: false, code: "unexpected" };
    }
  } catch (error) {
    console.error("saveCompositeFood failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag("foods");
  return { ok: true, data: { savedAt: Date.now(), mode } };
}

export type FoodImportFormState =
  | ActionResult<{ importedAt: number; count: number }, FoodImportErrorCode>
  | null;

/**
 * useActionState action for the JSON import dialog (field "json"). All or nothing.
 * fieldErrors keys come from foodImportErrorKey: "file", "<index>" or "<index>.<field>".
 */
export async function importFoodsAction(
  _prev: FoodImportFormState,
  formData: FormData,
): Promise<FoodImportFormState> {
  const json = formData.get("json");
  const parsed = parseFoodImport(typeof json === "string" ? json : "");
  if (!parsed.ok) {
    return {
      ok: false,
      code: "validation",
      fieldErrors: Object.fromEntries(parsed.errors.map((e) => [foodImportErrorKey(e), e.code])),
    };
  }

  let result: Awaited<ReturnType<typeof importFoods>>;
  try {
    result = await importFoods(parsed.data);
  } catch (error) {
    console.error("importFoodsAction failed", error);
    return { ok: false, code: "unexpected" };
  }
  if (!result.ok) {
    return {
      ok: false,
      code: "validation",
      fieldErrors: Object.fromEntries(
        result.takenIndexes.map((index) => [foodImportErrorKey({ index, field: "name" }), "nameTaken" as const]),
      ),
    };
  }

  updateTag("foods");
  return { ok: true, data: { importedAt: Date.now(), count: result.count } };
}

/** Called directly from the list (not a form). */
export async function archiveFoodAction(id: number): Promise<FoodRowActionResult> {
  return runToggle(id, archiveFood, "archiveFoodAction failed");
}

export async function restoreFoodAction(id: number): Promise<FoodRowActionResult> {
  return runToggle(id, restoreFood, "restoreFoodAction failed");
}

/** Permanent delete of an archived food; refused with "foodInUse" when a diary entry uses it. */
export async function deleteFoodAction(id: number): Promise<FoodRowActionResult> {
  return runToggle(id, deleteFood, "deleteFoodAction failed");
}

async function runToggle(
  rawId: unknown,
  toggle: (id: number) => ReturnType<typeof archiveFood>,
  logMessage: string,
): Promise<FoodRowActionResult> {
  const id = parseFoodId(rawId);
  if (id === null) return { ok: false, code: "unexpected" };

  try {
    const result = await toggle(id);
    if (!result.ok) {
      if (result.reason === "nameTaken") {
        return { ok: false, code: "validation", fieldErrors: { name: "nameTaken" } };
      }
      if (result.reason === "inUse") {
        return { ok: false, code: "validation", fieldErrors: { name: "foodInUse" } };
      }
      if (result.reason === "usedInComposite") {
        return { ok: false, code: "validation", fieldErrors: { name: "foodInComposite" } };
      }
      return { ok: false, code: "unexpected" };
    }
  } catch (error) {
    console.error(logMessage, error);
    return { ok: false, code: "unexpected" };
  }

  updateTag("foods");
  return { ok: true, data: null };
}
