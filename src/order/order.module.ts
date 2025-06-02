import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderGateway } from './order.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderGateway, PrismaService],
  exports: [OrderGateway, OrderService],
})
export class OrderModule {}