import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'TeamFlow API is running.';
  }

  async getHealth() {
    const result = await this.prisma.$queryRaw<{ current_database: string }[]>`
      SELECT current_database()
    `;

    return {
      api: 'ok',
      database: 'ok',
      databaseName: result[0]?.current_database ?? null,
    };
  }
}
