import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/siakad_pplg";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Dropping constraint tasks_subjectId_nama_key...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS "tasks_subjectId_nama_key" CASCADE;`);
    console.log("Success dropping constraint!");
  } catch (err: any) {
    console.error("Failed dropping constraint:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
