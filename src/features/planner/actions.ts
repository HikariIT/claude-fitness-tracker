"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { parseFoodId } from "@/lib/validation/foods";
import {
  parseDiaryEntryForm,
  type DiaryEntryErrorCode,
} from "@/lib/validation/diary";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  updateDiaryEntry,
} from "@/server/services/diary";

export type DiaryEntryFormState =
  | ActionResult<{ savedAt: number; mode: "created" | "updated" }, DiaryEntryErrorCode>
  | null;
export type DiaryRowActionResult = ActionResult<null, DiaryEntryErrorCode>;

/** useActionState action for the entry dialog. Hidden field "id": empty → create, else update. */
export async function saveDiaryEntry(
  _prev: DiaryEntryFormState,
  formData: FormData,
): Promise<DiaryEntryFormState> {
  const rawId = formData.get("id");
  let id: number | null = null;
  if (typeof rawId === "string" && rawId !== "") {
    id = parseFoodId(rawId);
    if (id === null) return { ok: false, code: "unexpected" };
  }

  const parsed = parseDiaryEntryForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  const mode = id === null ? "created" : "updated";
  let date: string;
  try {
    const result =
      id === null ? await createDiaryEntry(parsed.data) : await updateDiaryEntry(id, parsed.data);
    if (!result.ok) {
      if (result.reason === "foodUnavailable") {
        return { ok: false, code: "validation", fieldErrors: { foodId: "foodUnavailable" } };
      }
      if (result.reason === "portionUnavailable") {
        return { ok: false, code: "validation", fieldErrors: { portionId: "portionUnavailable" } };
      }
      if (result.reason === "quantityRange") {
        return { ok: false, code: "validation", fieldErrors: { amount: "quantityRange" } };
      }
      return { ok: false, code: "unexpected" };
    }
    date = result.entry.date;
  } catch (error) {
    console.error("saveDiaryEntry failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`planner:${date}`);
  return { ok: true, data: { savedAt: Date.now(), mode } };
}

/** Called directly from the day list (not a form). */
export async function deleteDiaryEntryAction(id: number): Promise<DiaryRowActionResult> {
  const entryId = parseFoodId(id);
  if (entryId === null) return { ok: false, code: "unexpected" };

  let date: string;
  try {
    const result = await deleteDiaryEntry(entryId);
    if (!result.ok) return { ok: false, code: "unexpected" };
    date = result.date;
  } catch (error) {
    console.error("deleteDiaryEntryAction failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag(`planner:${date}`);
  return { ok: true, data: null };
}
