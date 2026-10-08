import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Boot-time migrations without the drizzle-kit binary (unreliable inside
// minimal images). Run from apps/api so ./src/db/migrations resolves.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrate] missing DATABASE_URL");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  console.log("[migrate] done");
} finally {
  await client.end();
}
