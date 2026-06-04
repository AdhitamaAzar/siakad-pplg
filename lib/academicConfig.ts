import prisma from "./prisma";

export async function getActiveAcademicConfig() {
  try {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { tahunAjaran: true },
    });
    return {
      tahunAjaran: activeYear?.tahunAjaran || "2025/2026",
      semester: "Genap",
    };
  } catch (error) {
    return {
      tahunAjaran: "2025/2026",
      semester: "Genap",
    };
  }
}
