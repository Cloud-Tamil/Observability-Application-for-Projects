import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  {
    slug: 'aurora-wireless-headphones',
    name: 'Aurora Wireless Headphones',
    description: 'Active noise cancelling, 40-hour battery, USB-C fast charge.',
    priceCents: 24900,
    stock: 25,
    imageUrl: 'https://picsum.photos/seed/aurora/600/600',
  },
  {
    slug: 'nimbus-mechanical-keyboard',
    name: 'Nimbus Mechanical Keyboard',
    description: '75% layout, hot-swappable switches, aluminium frame.',
    priceCents: 15900,
    stock: 40,
    imageUrl: 'https://picsum.photos/seed/nimbus/600/600',
  },
  {
    slug: 'pulse-smartwatch',
    name: 'Pulse Smartwatch',
    description: 'AMOLED display, GPS, 7-day battery, 5ATM water resistance.',
    priceCents: 32900,
    stock: 15,
    imageUrl: 'https://picsum.photos/seed/pulse/600/600',
  },
  {
    slug: 'glow-desk-lamp',
    name: 'Glow Desk Lamp',
    description: 'Adjustable colour temperature, USB-C charging port.',
    priceCents: 6900,
    stock: 60,
    imageUrl: 'https://picsum.photos/seed/glow/600/600',
  },
  {
    slug: 'echo-bluetooth-speaker',
    name: 'Echo Bluetooth Speaker',
    description: 'IPX7 waterproof, 20-hour playtime, stereo pairing.',
    priceCents: 11900,
    stock: 30,
    imageUrl: 'https://picsum.photos/seed/echo/600/600',
  },
];

async function main() {
  const adminPassword = await bcrypt.hash('admin12345', 12);
  const customerPassword = await bcrypt.hash('customer12345', 12);

  await prisma.user.upsert({
    where: { email: 'admin@shopsphere.dev' },
    update: {},
    create: {
      email: 'admin@shopsphere.dev',
      name: 'Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@shopsphere.dev' },
    update: {},
    create: {
      email: 'customer@shopsphere.dev',
      name: 'Customer',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
