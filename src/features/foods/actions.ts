"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import {
  parseFoodForm,
  parseFoodId,
  type FoodErrorCode,
} from "@/lib/validation/foods";
import {
  archiveFood,
  createFood,
  deleteFood,
  restoreFood,
  updateFood,
} from "@/server/services/foods";

export type FoodFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, FoodErrorCode>
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
      return { ok: false, code: "unexpected" };
    }
  } catch (error) {
    console.error(logMessage, error);
    return { ok: false, code: "unexpected" };
  }

  updateTag("foods");
  return { ok: true, data: null };
}
