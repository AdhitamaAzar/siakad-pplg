import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/siakad_pplg";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true
    }
  });

  console.log(`TOTAL TEACHERS: ${teachers.length}`);
  teachers.forEach(t => {
    console.log(`- ID: ${t.id}, Name: "${t.nama}", NIP: "${t.nip}", User ID: ${t.userId}, Username: "${t.user?.username}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

