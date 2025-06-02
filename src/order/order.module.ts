// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderGateway } from './order.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { TableService } from 'src/table/table.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderGateway, PrismaService],
  exports: [OrderService, OrderGateway],
})
export class OrderModule {}