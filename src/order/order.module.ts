// src/order/order.module.ts
import { Module } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderGateway } from './order.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { TableService } from 'src/table/table.service';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderGateway, TableService, PrismaService],
  exports: [ OrderGateway],
})
export class OrderModule {}