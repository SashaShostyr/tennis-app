import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { AnalyzeDto } from './dto/analyze.dto';
import type { AnalyzeResult } from './coach.types';

@Injectable()
export class CoachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async analyze(userId: string, dto: AnalyzeDto): Promise<AnalyzeResult> {
    // If linking to a session, make sure it belongs to this user.
    if (dto.sessionId) {
      const owned = await this.prisma.session.count({
        where: { id: dto.sessionId, userId },
      });
      if (!owned) {
        throw new BadRequestException('Invalid session.');
      }
    }

    const feedback = await this.gemini.analyzeShot({
      shotType: dto.shotType,
      handedness: dto.handedness,
      twoHandedBackhand: dto.twoHandedBackhand,
      metrics: dto.metrics,
      keyframes: dto.keyframes,
    });

    const saved = await this.prisma.analysis.create({
      data: {
        userId,
        sessionId: dto.sessionId ?? null,
        shotType: dto.shotType,
        handedness: dto.handedness,
        twoHandedBackhand: dto.twoHandedBackhand ?? false,
        overallScore: feedback.overallScore,
        summary: feedback.summary,
        strengths: feedback.strengths,
        improvements: feedback.improvements as unknown as Prisma.InputJsonValue,
        metrics: dto.metrics as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return { ...feedback, analysisId: saved.id };
  }

  findAll(userId: string, sessionId?: string) {
    return this.prisma.analysis.findMany({
      where: { userId, ...(sessionId ? { sessionId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const analysis = await this.prisma.analysis.findFirst({ where: { id, userId } });
    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }
    return analysis;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // ownership check
    await this.prisma.analysis.delete({ where: { id } });
    return { success: true };
  }
}
