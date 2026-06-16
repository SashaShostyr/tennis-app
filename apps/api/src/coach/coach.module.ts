import { Module } from '@nestjs/common';
import { CoachService } from './coach.service';
import { CoachController } from './coach.controller';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [CoachController],
  providers: [CoachService, GeminiService],
})
export class CoachModule {}
