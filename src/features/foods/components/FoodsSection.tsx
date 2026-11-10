import { connection } from "next/server";
import { listFoods } from "@/server/dal/foods";
import { FoodsView } from "./FoodsView";

/** Reads the food list per request, so the DB read stays out of the build-time prerender. */
export async function FoodsSection() {
  await connection();
  const foods = await listFoods();
  return <FoodsView foods={foods} />;
}
