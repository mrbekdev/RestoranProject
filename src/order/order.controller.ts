import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderItemStatus } from '@prisma/client';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get('kitchen')
  getKitchenOrders() {
    return this.orderService.getKitchenOrders();
  }

  @Get('ready-items')
  getReadyItems() {
    return this.orderService.getReadyItems();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(+id, updateOrderDto);
  }

@Patch('item/:itemId/status')
  updateOrderItemStatus(
    @Param('itemId') itemId: string,
    @Body() body: { status?: OrderItemStatus; count?: number },
  ) {
    return this.orderService.updateOrderItemStatus(+itemId, body.status, body.count);
  }

  @Delete('orderItem/:id')
  removeItem(@Param('id') id: string) {
    return this.orderService.removeItem(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }
}