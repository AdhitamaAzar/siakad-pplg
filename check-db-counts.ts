import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/siakad_pplg";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();
  const teacherCount = await prisma.teacher.count();
  console.log("Total users in DB:", userCount);
  console.log("Total students in DB:", studentCount);
  console.log("Total teachers in DB:", teacherCount);

  // Print roles
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    }
  });
  console.log("Roles count:", JSON.stringify(roles, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
