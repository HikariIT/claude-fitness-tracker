import { connection } from "next/server";
import { listFoodComponents, listFoodPortions, listFoods } from "@/server/dal/foods";
import { FoodsView } from "./FoodsView";

/** Reads the food list per request, so the DB read stays out of the build-time prerender. */
export async function FoodsSection() {
  await connection();
  const [foods, components, portions] = await Promise.all([
    listFoods(),
    listFoodComponents(),
    listFoodPortions(),
  ]);
  return <FoodsView foods={foods} components={components} portions={portions} />;
}
