import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CoachService } from './coach.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(private readonly coach: CoachService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeDto) {
    return this.coach.analyze(user.id, dto);
  }

  @Get('analyses')
  findAll(@CurrentUser() user: AuthUser, @Query('sessionId') sessionId?: string) {
    return this.coach.findAll(user.id, sessionId);
  }

  @Get('analyses/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coach.findOne(user.id, id);
  }

  @Delete('analyses/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coach.remove(user.id, id);
  }
}
