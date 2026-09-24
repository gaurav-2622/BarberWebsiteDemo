import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  AppointmentStatus,
  BookingSource,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";
import {
  ensureAdminAccount,
  parseAdminEnvironment,
} from "../src/lib/admin/ensure-admin";
import { createManagementToken } from "../src/lib/booking/tokens";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function futureDate(daysFromNow: number, hourUtc: number, minute = 0) {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hourUtc, minute, 0, 0);

  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const settings = await prisma.shopSettings.upsert({
    where: { id: "default" },
    update: {
      businessName: "Crown & Blade Barbershop",
      tagline: "Classic craft. Modern style.",
      email: "hello@crownandblade.example",
      phone: "+1-212-555-0147",
      bookingEnabled: true,
      onlinePaymentsEnabled: true,
    },
    create: {
      id: "default",
      businessName: "Crown & Blade Barbershop",
      tagline: "Classic craft. Modern style.",
      description:
        "A neighborhood barbershop offering precision cuts, beard work, and traditional hot-towel shaves.",
      email: "hello@crownandblade.example",
      phone: "+1-212-555-0147",
      addressLine1: "125 Mercer Street",
      city: "New York",
      state: "NY",
      postalCode: "10012",
      country: "US",
      timeZone: "America/New_York",
      currency: "USD",
      bookingWindowDays: 60,
      minimumLeadTimeMinutes: 120,
      cancellationWindowHours: 24,
      slotIntervalMinutes: 15,
      defaultDepositCents: 1000,
      bookingEnabled: true,
      onlinePaymentsEnabled: true,
      confirmationEmailEnabled: true,
      reminderEmailEnabled: true,
      reminderLeadHours: 24,
      instagramUrl: "https://instagram.com/crownandblade",
    },
  });

  const adminCredentials = parseAdminEnvironment(process.env);

  const owner = await prisma.user.upsert({
    where: { email: "owner@crownandblade.example" },
    update: {
      name: "Daniel Brooks",
      phone: "+1-212-555-0101",
      image: "/images/daniel-barber.png",
      role: UserRole.OWNER,
      isActive: true,
    },
    create: {
      name: "Daniel Brooks",
      email: "owner@crownandblade.example",
      phone: "+1-212-555-0101",
      image: "/images/daniel-barber.png",
      role: UserRole.OWNER,
      slug: "daniel-brooks",
      jobTitle: "Owner & Master Barber",
      bio: "Daniel pairs traditional barbering techniques with modern, low-maintenance styles.",
    },
  });

  const barber = await prisma.user.upsert({
    where: { email: "marcus@crownandblade.example" },
    update: {
      name: "Marcus Reed",
      phone: "+1-212-555-0102",
      image: "/images/marcus-barber.png",
      role: UserRole.BARBER,
      isActive: true,
    },
    create: {
      name: "Marcus Reed",
      email: "marcus@crownandblade.example",
      phone: "+1-212-555-0102",
      image: "/images/marcus-barber.png",
      role: UserRole.BARBER,
      slug: "marcus-reed",
      jobTitle: "Senior Barber",
      bio: "Marcus specializes in skin fades, textured cuts, and detailed beard shaping.",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "jordan.lee@example.com" },
    update: {
      name: "Jordan Lee",
      phone: "+1-917-555-0198",
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    create: {
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      phone: "+1-917-555-0198",
      role: UserRole.CUSTOMER,
    },
  });

  const serviceData = [
    {
      name: "Signature Haircut",
      slug: "signature-haircut",
      description:
        "Consultation, precision haircut, hot-towel finish, and styling.",
      category: "Haircuts",
      durationMinutes: 45,
      bufferMinutes: 10,
      priceCents: 4500,
      depositCents: 1000,
      sortOrder: 1,
    },
    {
      name: "Skin Fade",
      slug: "skin-fade",
      description: "Detailed skin fade with a tailored top and styled finish.",
      category: "Haircuts",
      durationMinutes: 60,
      bufferMinutes: 10,
      priceCents: 5500,
      depositCents: 1500,
      sortOrder: 2,
    },
    {
      name: "Beard Sculpt",
      slug: "beard-sculpt",
      description: "Beard trim, line-up, conditioning, and razor detailing.",
      category: "Beard",
      durationMinutes: 30,
      bufferMinutes: 5,
      priceCents: 3000,
      depositCents: 500,
      sortOrder: 3,
    },
    {
      name: "Traditional Hot-Towel Shave",
      slug: "hot-towel-shave",
      description:
        "A traditional straight-razor shave with hot towels and skin treatment.",
      category: "Shaves",
      durationMinutes: 45,
      bufferMinutes: 10,
      priceCents: 4000,
      depositCents: 1000,
      sortOrder: 4,
    },
    {
      name: "Haircut & Beard",
      slug: "haircut-and-beard",
      description:
        "Complete haircut paired with beard shaping and razor line-up.",
      category: "Packages",
      durationMinutes: 75,
      bufferMinutes: 10,
      priceCents: 7000,
      depositCents: 2000,
      sortOrder: 5,
    },
    {
      name: "Young Gentleman Cut",
      slug: "young-gentleman-cut",
      description: "A tailored haircut for guests age 12 and under.",
      category: "Haircuts",
      durationMinutes: 30,
      bufferMinutes: 5,
      priceCents: 3200,
      depositCents: 500,
      sortOrder: 6,
    },
  ];

  const services = await Promise.all(
    serviceData.map((service) =>
      prisma.service.upsert({
        where: { slug: service.slug },
        update: { ...service, isActive: true },
        create: { ...service, currency: "USD" },
      }),
    ),
  );

  for (const teamMember of [owner, barber]) {
    for (const service of services) {
      await prisma.barberService.upsert({
        where: {
          barberId_serviceId: {
            barberId: teamMember.id,
            serviceId: service.id,
          },
        },
        update: { isActive: true },
        create: {
          barberId: teamMember.id,
          serviceId: service.id,
        },
      });
    }
  }

  for (const teamMember of [owner, barber]) {
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      const isSunday = dayOfWeek === 0;

      await prisma.workingHour.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId: teamMember.id,
            dayOfWeek,
          },
        },
        update: {
          startMinute: 9 * 60,
          endMinute: 18 * 60,
          isActive: !isSunday,
        },
        create: {
          barberId: teamMember.id,
          dayOfWeek,
          startMinute: 9 * 60,
          endMinute: 18 * 60,
          isActive: !isSunday,
        },
      });
    }
  }

  const blockStartsAt = futureDate(5, 17);

  await prisma.blockedTime.upsert({
    where: { id: "f10c9015-20bd-4ae3-a40d-45829442310e" },
    update: {
      barberId: barber.id,
      startsAt: blockStartsAt,
      endsAt: addMinutes(blockStartsAt, 60),
      reason: "Team training",
    },
    create: {
      id: "f10c9015-20bd-4ae3-a40d-45829442310e",
      barberId: barber.id,
      startsAt: blockStartsAt,
      endsAt: addMinutes(blockStartsAt, 60),
      reason: "Team training",
    },
  });

  const signatureHaircut = services.find(
    (service) => service.slug === "signature-haircut",
  );
  const beardSculpt = services.find(
    (service) => service.slug === "beard-sculpt",
  );
  const haircutAndBeard = services.find(
    (service) => service.slug === "haircut-and-beard",
  );

  if (!signatureHaircut || !beardSculpt || !haircutAndBeard) {
    throw new Error("Seed services were not created.");
  }

  const jordanStartsAt = futureDate(2, 14);
  const guestStartsAt = futureDate(3, 17, 30);
  const phoneStartsAt = futureDate(4, 19);

  await prisma.appointment.upsert({
    where: { confirmationCode: "CB-DEMO-001" },
    update: {
      startsAt: jordanStartsAt,
      endsAt: addMinutes(
        jordanStartsAt,
        signatureHaircut.durationMinutes + signatureHaircut.bufferMinutes,
      ),
      serviceBufferMinutes: signatureHaircut.bufferMinutes,
      status: AppointmentStatus.CONFIRMED,
    },
    create: {
      confirmationCode: "CB-DEMO-001",
      managementToken: createManagementToken(),
      customerId: customer.id,
      barberId: owner.id,
      serviceId: signatureHaircut.id,
      customerName: customer.name ?? "Jordan Lee",
      customerEmail: customer.email ?? "jordan.lee@example.com",
      customerPhone: customer.phone ?? "+1-917-555-0198",
      serviceName: signatureHaircut.name,
      serviceDurationMinutes: signatureHaircut.durationMinutes,
      serviceBufferMinutes: signatureHaircut.bufferMinutes,
      startsAt: jordanStartsAt,
      endsAt: addMinutes(
        jordanStartsAt,
        signatureHaircut.durationMinutes + signatureHaircut.bufferMinutes,
      ),
      status: AppointmentStatus.CONFIRMED,
      bookingSource: BookingSource.WEBSITE,
      priceCents: signatureHaircut.priceCents,
      depositCents: signatureHaircut.depositCents,
      amountPaidCents: signatureHaircut.depositCents,
      paymentStatus: PaymentStatus.PAID,
      customerNotes: "Low taper on the sides, please.",
    },
  });

  await prisma.appointment.upsert({
    where: { confirmationCode: "CB-DEMO-002" },
    update: {
      startsAt: guestStartsAt,
      endsAt: addMinutes(
        guestStartsAt,
        beardSculpt.durationMinutes + beardSculpt.bufferMinutes,
      ),
      serviceBufferMinutes: beardSculpt.bufferMinutes,
      status: AppointmentStatus.PENDING,
    },
    create: {
      confirmationCode: "CB-DEMO-002",
      managementToken: createManagementToken(),
      barberId: barber.id,
      serviceId: beardSculpt.id,
      customerName: "Alex Morgan",
      customerEmail: "alex.morgan@example.com",
      customerPhone: "+1-646-555-0153",
      serviceName: beardSculpt.name,
      serviceDurationMinutes: beardSculpt.durationMinutes,
      serviceBufferMinutes: beardSculpt.bufferMinutes,
      startsAt: guestStartsAt,
      endsAt: addMinutes(
        guestStartsAt,
        beardSculpt.durationMinutes + beardSculpt.bufferMinutes,
      ),
      status: AppointmentStatus.PENDING,
      bookingSource: BookingSource.WEBSITE,
      priceCents: beardSculpt.priceCents,
      depositCents: beardSculpt.depositCents,
      paymentStatus: PaymentStatus.PENDING,
    },
  });

  await prisma.appointment.upsert({
    where: { confirmationCode: "CB-DEMO-003" },
    update: {
      startsAt: phoneStartsAt,
      endsAt: addMinutes(
        phoneStartsAt,
        haircutAndBeard.durationMinutes + haircutAndBeard.bufferMinutes,
      ),
      serviceBufferMinutes: haircutAndBeard.bufferMinutes,
      status: AppointmentStatus.CONFIRMED,
    },
    create: {
      confirmationCode: "CB-DEMO-003",
      managementToken: createManagementToken(),
      barberId: owner.id,
      serviceId: haircutAndBeard.id,
      customerName: "Sam Rivera",
      customerEmail: "sam.rivera@example.com",
      customerPhone: "+1-718-555-0114",
      serviceName: haircutAndBeard.name,
      serviceDurationMinutes: haircutAndBeard.durationMinutes,
      serviceBufferMinutes: haircutAndBeard.bufferMinutes,
      startsAt: phoneStartsAt,
      endsAt: addMinutes(
        phoneStartsAt,
        haircutAndBeard.durationMinutes + haircutAndBeard.bufferMinutes,
      ),
      status: AppointmentStatus.CONFIRMED,
      bookingSource: BookingSource.PHONE,
      priceCents: haircutAndBeard.priceCents,
      depositCents: 0,
      paymentStatus: PaymentStatus.NOT_REQUIRED,
      internalNotes: "Pay in shop.",
    },
  });

  if (adminCredentials.success) {
    const admin = await ensureAdminAccount(prisma, adminCredentials.data);
    console.info(`Owner login is ready for ${admin.email}.`);
  } else {
    console.info(
      "Owner login was not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD, then run npm run db:seed:admin.",
    );
  }

  console.info(
    `Seeded ${settings.businessName}: ${services.length} services, 2 barbers, and 3 appointments.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
