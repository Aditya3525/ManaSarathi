const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function clear() {
  await prisma.crisisResource.deleteMany();
  await prisma.therapistBooking.deleteMany();
  await prisma.therapist.deleteMany();
  console.log("Cleared tables");
}
clear().finally(() => prisma.$disconnect());
