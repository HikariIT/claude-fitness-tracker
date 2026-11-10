"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { parseProfileForm, type ProfileErrorCode } from "@/lib/validation/profile";
import { saveSettings } from "@/server/services/settings";

export type ProfileActionState = ActionResult<{ savedAt: number }, ProfileErrorCode> | null;

/** Server-local calendar date as "YYYY-MM-DD". */
function localToday(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = parseProfileForm(formData, localToday(new Date()));
  if (!parsed.ok) {
    return { ok: false, code: "validation", fieldErrors: parsed.fieldErrors };
  }

  try {
    await saveSettings(parsed.data);
  } catch (error) {
    console.error("saveProfile failed", error);
    return { ok: false, code: "unexpected" };
  }

  updateTag("settings");
  return { ok: true, data: { savedAt: Date.now() } };
}
