import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const depsToRemove = ['IT', 'TRADING COMMERCIAL'];
  const fallback = await prisma.department.findFirst({ where: { name: 'HR&ADMIN-IT' } });

  if (fallback) {
    for (const dName of depsToRemove) {
      const d = await prisma.department.findUnique({ where: { name: dName } });
      if (d) {
        // reassign employees
        await prisma.employee.updateMany({
          where: { departmentId: d.id },
          data: { departmentId: fallback.id }
        });
        // delete
        await prisma.department.delete({ where: { id: d.id } });
        console.log(`Deleted ${dName}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
