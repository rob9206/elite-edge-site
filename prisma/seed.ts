import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const fotiPassword = process.env.SEED_FOTI_PASSWORD ?? 'foti-dev-pass';
  const stevePassword = process.env.SEED_STEVE_PASSWORD ?? 'steve-dev-pass';

  await prisma.user.upsert({
    where: { username: 'foti' },
    update: { role: 'admin', name: 'Foti', passwordHash: await bcrypt.hash(fotiPassword, 10) },
    create: { username: 'foti', name: 'Foti', role: 'admin', passwordHash: await bcrypt.hash(fotiPassword, 10) },
  });

  await prisma.user.upsert({
    where: { username: 'steve' },
    update: { role: 'crew', name: 'Steve', passwordHash: await bcrypt.hash(stevePassword, 10) },
    create: { username: 'steve', name: 'Steve', role: 'crew', passwordHash: await bcrypt.hash(stevePassword, 10) },
  });

  console.log('Seeded users: foti (admin), steve (crew).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
