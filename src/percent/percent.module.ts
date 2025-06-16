import { Module } from '@nestjs/common';
import { PercentService } from './percent.service';
import { PercentController } from './percent.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PercentController],
  providers: [PercentService,PrismaService],
})
export class PercentModule {}
