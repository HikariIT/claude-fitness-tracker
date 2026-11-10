import { connection } from "next/server";
import { listFoodComponents, listFoods } from "@/server/dal/foods";
import { FoodsView } from "./FoodsView";

/** Reads the food list per request, so the DB read stays out of the build-time prerender. */
export async function FoodsSection() {
  await connection();
  const [foods, components] = await Promise.all([listFoods(), listFoodComponents()]);
  return <FoodsView foods={foods} components={components} />;
}
