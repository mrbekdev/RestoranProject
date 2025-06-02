import { Module } from '@nestjs/common';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TableController],
  providers: [TableService, PrismaService],
  exports: [TableService], // 👈 TO‘G‘RI
})
export class TableModule {}
