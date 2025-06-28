import { Module } from '@nestjs/common';
import { AuthCheckService } from './auth-check.service';
import { AuthCheckController } from './auth-check.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AuthCheckController],
  providers: [AuthCheckService,PrismaService],
})
export class AuthCheckModule {}
