import { PrismaClient, Surface, SessionType, ParticipantRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Demo account credentials.
const DEMO_EMAIL = 'demo@tennis.app';
const DEMO_PASSWORD = 'password123';

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Idempotent: wipe and recreate the demo user's data.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, password, name: 'Demo Player' },
  });

  const sam = await prisma.contact.create({
    data: { userId: user.id, name: 'Sam', notes: 'Lefty, strong serve' },
  });
  const jordan = await prisma.contact.create({
    data: { userId: user.id, name: 'Jordan', notes: 'Hitting partner' },
  });
  const coach = await prisma.contact.create({
    data: { userId: user.id, name: 'Coach Lee', notes: 'Weekly lessons' },
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // A spread of sessions across the last ~8 weeks to make stats interesting.
  const plans: Array<{
    daysAgo: number;
    durationMin: number;
    surface: Surface;
    type: SessionType;
    indoor: boolean;
    location: string;
    feel: number;
    energy: number;
    fun: number;
    participants?: Array<{ contactId: string; role: ParticipantRole }>;
  }> = [
    { daysAgo: 2, durationMin: 90, surface: Surface.CLAY, type: SessionType.MATCH, indoor: false, location: 'City Courts', feel: 4, energy: 3, fun: 5, participants: [{ contactId: sam.id, role: ParticipantRole.OPPONENT }] },
    { daysAgo: 5, durationMin: 60, surface: Surface.HARD, type: SessionType.PRACTICE, indoor: false, location: 'City Courts', feel: 3, energy: 4, fun: 4, participants: [{ contactId: jordan.id, role: ParticipantRole.PARTNER }] },
    { daysAgo: 9, durationMin: 45, surface: Surface.HARD, type: SessionType.LESSON, indoor: true, location: 'Indoor Club', feel: 4, energy: 4, fun: 4, participants: [{ contactId: coach.id, role: ParticipantRole.PARTNER }] },
    { daysAgo: 12, durationMin: 75, surface: Surface.CLAY, type: SessionType.MATCH, indoor: false, location: 'City Courts', feel: 2, energy: 2, fun: 3, participants: [{ contactId: sam.id, role: ParticipantRole.OPPONENT }] },
    { daysAgo: 16, durationMin: 30, surface: Surface.HARD, type: SessionType.WALL, indoor: false, location: 'Park', feel: 3, energy: 5, fun: 3 },
    { daysAgo: 20, durationMin: 60, surface: Surface.HARD, type: SessionType.DRILLS, indoor: true, location: 'Indoor Club', feel: 4, energy: 4, fun: 4, participants: [{ contactId: jordan.id, role: ParticipantRole.PARTNER }] },
    { daysAgo: 27, durationMin: 90, surface: Surface.GRASS, type: SessionType.MATCH, indoor: false, location: 'Lawn Club', feel: 5, energy: 4, fun: 5, participants: [{ contactId: sam.id, role: ParticipantRole.OPPONENT }] },
    { daysAgo: 34, durationMin: 50, surface: Surface.HARD, type: SessionType.CARDIO, indoor: true, location: 'Gym', feel: 3, energy: 3, fun: 2 },
  ];

  for (const p of plans) {
    await prisma.session.create({
      data: {
        userId: user.id,
        date: new Date(now - p.daysAgo * day),
        durationMin: p.durationMin,
        location: p.location,
        surface: p.surface,
        indoor: p.indoor,
        type: p.type,
        feelRating: p.feel,
        energyRating: p.energy,
        funRating: p.fun,
        participants: p.participants ? { create: p.participants } : undefined,
      },
    });
  }

  console.log(`Seeded demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${plans.length} sessions)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
