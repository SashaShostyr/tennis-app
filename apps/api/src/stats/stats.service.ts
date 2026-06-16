import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WEEKS_WINDOW = 12;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `d`. */
function startOfWeekUTC(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function weekKey(d: Date): string {
  return startOfWeekUTC(d).toISOString().slice(0, 10);
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { date: true, durationMin: true, surface: true, type: true },
    });

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Sessions counted per ISO week (Monday-based).
    const countByWeek = new Map<string, number>();
    for (const s of sessions) {
      const key = weekKey(s.date);
      countByWeek.set(key, (countByWeek.get(key) ?? 0) + 1);
    }

    const thisWeekStart = startOfWeekUTC(new Date());

    // Build the last 12 weeks (oldest -> newest) for the frequency chart.
    const weekly: { weekStart: string; count: number }[] = [];
    for (let i = WEEKS_WINDOW - 1; i >= 0; i--) {
      const ws = new Date(thisWeekStart.getTime() - i * MS_PER_WEEK);
      const key = ws.toISOString().slice(0, 10);
      weekly.push({ weekStart: key, count: countByWeek.get(key) ?? 0 });
    }

    const last4 = weekly.slice(-4).reduce((sum, w) => sum + w.count, 0);
    const last12 = weekly.reduce((sum, w) => sum + w.count, 0);
    const perWeekLast4 = Math.round((last4 / 4) * 10) / 10;
    const perWeekLast12 = Math.round((last12 / 12) * 10) / 10;

    const currentStreakWeeks = this.computeCurrentStreak(countByWeek, thisWeekStart);
    const longestStreakWeeks = this.computeLongestStreak(countByWeek);

    const bySurface = this.breakdown(sessions.map((s) => s.surface));
    const byType = this.breakdown(sessions.map((s) => s.type));

    return {
      totalSessions,
      totalHours,
      currentStreakWeeks,
      longestStreakWeeks,
      perWeekLast4,
      perWeekLast12,
      weekly,
      bySurface,
      byType,
    };
  }

  /**
   * Consecutive active weeks ending at "now". The in-progress current week is
   * allowed to be empty without breaking the streak (we start from last week
   * in that case), since the user may simply not have played yet this week.
   */
  private computeCurrentStreak(countByWeek: Map<string, number>, thisWeekStart: Date): number {
    const isActive = (offset: number) => {
      const ws = new Date(thisWeekStart.getTime() - offset * MS_PER_WEEK);
      return (countByWeek.get(ws.toISOString().slice(0, 10)) ?? 0) > 0;
    };

    let start = 0;
    if (!isActive(0)) {
      if (!isActive(1)) return 0; // missed both this week and last week
      start = 1; // current week not played yet, count from last week
    }

    let streak = 0;
    for (let offset = start; ; offset++) {
      if (isActive(offset)) streak++;
      else break;
    }
    return streak;
  }

  /** Longest run of consecutive active weeks across the user's history. */
  private computeLongestStreak(countByWeek: Map<string, number>): number {
    const activeWeeks = [...countByWeek.entries()]
      .filter(([, count]) => count > 0)
      .map(([key]) => new Date(key + 'T00:00:00.000Z').getTime())
      .sort((a, b) => a - b);

    if (activeWeeks.length === 0) return 0;

    let longest = 1;
    let run = 1;
    for (let i = 1; i < activeWeeks.length; i++) {
      const gap = activeWeeks[i] - activeWeeks[i - 1];
      if (Math.round(gap / MS_PER_WEEK) === 1) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 1;
      }
    }
    return longest;
  }

  private breakdown(values: string[]) {
    const counts = new Map<string, number>();
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }
}
