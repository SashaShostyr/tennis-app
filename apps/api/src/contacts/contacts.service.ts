import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.contact.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, userId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    return contact;
  }

  create(userId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: { userId, name: dto.name, notes: dto.notes ?? null },
    });
  }

  async update(userId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(userId, id); // ownership check
    return this.prisma.contact.update({
      where: { id },
      data: { name: dto.name, notes: dto.notes },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // ownership check
    await this.prisma.contact.delete({ where: { id } });
    return { success: true };
  }
}
