import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSessionDto,
  ListSessionsQueryDto,
  ParticipantDto,
  UpdateSessionDto,
} from './dto/session.dto';

const includeParticipants = {
  participants: { include: { contact: true } },
} satisfies Prisma.SessionInclude;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, query: ListSessionsQueryDto) {
    const where: Prisma.SessionWhereInput = { userId };
    if (query.type) {
      where.type = query.type;
    }
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }
    return this.prisma.session.findMany({
      where,
      include: includeParticipants,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, userId },
      include: includeParticipants,
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async create(userId: string, dto: CreateSessionDto) {
    await this.assertContactsOwned(userId, dto.participants);
    return this.prisma.session.create({
      data: {
        userId,
        date: new Date(dto.date),
        durationMin: dto.durationMin,
        location: dto.location ?? null,
        surface: dto.surface,
        indoor: dto.indoor ?? false,
        type: dto.type,
        feelRating: dto.feelRating ?? null,
        energyRating: dto.energyRating ?? null,
        funRating: dto.funRating ?? null,
        notes: dto.notes ?? null,
        participants: dto.participants?.length
          ? {
              create: dto.participants.map((p) => ({
                contactId: p.contactId,
                role: p.role,
              })),
            }
          : undefined,
      },
      include: includeParticipants,
    });
  }

  async update(userId: string, id: string, dto: UpdateSessionDto) {
    await this.findOne(userId, id); // ownership check
    if (dto.participants) {
      await this.assertContactsOwned(userId, dto.participants);
    }

    // Replace participants wholesale when provided.
    return this.prisma.session.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        durationMin: dto.durationMin,
        location: dto.location,
        surface: dto.surface,
        indoor: dto.indoor,
        type: dto.type,
        feelRating: dto.feelRating,
        energyRating: dto.energyRating,
        funRating: dto.funRating,
        notes: dto.notes,
        participants: dto.participants
          ? {
              deleteMany: {},
              create: dto.participants.map((p) => ({
                contactId: p.contactId,
                role: p.role,
              })),
            }
          : undefined,
      },
      include: includeParticipants,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // ownership check
    await this.prisma.session.delete({ where: { id } });
    return { success: true };
  }

  // Guards against attaching another user's contacts (or non-existent ones).
  private async assertContactsOwned(userId: string, participants?: ParticipantDto[]) {
    if (!participants?.length) return;
    const ids = [...new Set(participants.map((p) => p.contactId))];
    const owned = await this.prisma.contact.count({
      where: { id: { in: ids }, userId },
    });
    if (owned !== ids.length) {
      throw new BadRequestException('One or more contacts are invalid');
    }
  }
}
