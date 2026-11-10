import { connection } from "next/server";
import { getSettings } from "@/server/dal/settings";
import { ProfileForm } from "./ProfileForm";

/** Reads the saved profile per request; "today" is the server's local calendar date. */
export async function ProfileSection() {
  await connection();
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const initial = await getSettings();
  return <ProfileForm initial={initial} today={today} />;
}
