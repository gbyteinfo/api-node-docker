import { openDb } from "./database";

export async function setupDatabase() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      measure_uuid TEXT UNIQUE,
      customer_code TEXT,
      measure_datetime TEXT,
      measure_type TEXT,
      has_confirmed BOOLEAN,
      image_url TEXT,
      confirmed_value INTEGER
    )
  `);
  console.log("Database setup complete.");
}

setupDatabase().catch((err) => console.error(err));
