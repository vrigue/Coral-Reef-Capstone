import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { desc, inArray } from "drizzle-orm";
import { dataTable } from "src/db/data-schema";

const db = drizzle(process.env.DATABASE_URL!);

export default async function getMostRecentData(types: string[]) {
  try {
    const result = await db
      .select()
      .from(dataTable)
      .where(inArray(dataTable.name, types)) // Filter by types
      .orderBy(desc(dataTable.datetime)) // Order by most recent first
      .limit(10*types.length); // Get only the most recent per type

    console.log(`Fetched most recent values for types: ${types}.`);

    return result;
  } catch (error) {
    console.error("Error fetching most recent data:", error);
    throw new Error("Failed to fetch most recent data.");
  }
}
