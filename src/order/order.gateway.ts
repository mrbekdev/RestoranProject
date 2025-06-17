import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderItemStatus, OrderStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrderDto } from './dto/update-order.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()

export class OrderGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const role = client.handshake.query.role;
    const restaurantId = client.handshake.query.restaurantId || 'default';
    if (role) {
      client.join(`${role}-${restaurantId}`);
    }
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('fetch_tables')
  async handleFetchTables(@MessageBody() data: { restaurantId?: string }, @ConnectedSocket() client: Socket) {
    try {
      const tables = await this.prisma.table.findMany();
      client.emit('fetch_tables_response', { status: 'ok', tables });
    } catch (error) {
      client.emit('fetch_tables_response', {
        status: 'error',
        message: error.message || 'Failed to fetch tables',
      });
    }
  }

  @SubscribeMessage('fetch_kitchen_orders')
  async handleFetchKitchenOrders(@MessageBody() data: { restaurantId?: string }, @ConnectedSocket() client: Socket) {
    try {
      const orders = await this.orderService.getKitchenOrders();
      client.emit('fetch_kitchen_orders_response', { status: 'ok', orders });
    } catch (error) {
      client.emit('fetch_kitchen_orders_response', {
        status: 'error',
        message: error.message || 'Failed to fetch kitchen orders',
      });
    }
  }

  @SubscribeMessage('create_order')
  async handleCreateOrder(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      const order = await this.orderService.create(data);
      this.server.to(`kitchen-${data.restaurantId || 'default'}`).emit('orderCreated', order);
      this.server.to(`waiter-${data.restaurantId || 'default'}`).emit('orderCreated', order);
      client.emit('create_order_response', { status: 'ok', order });
    } catch (error) {
      client.emit('create_order_response', {
        status: 'error',
        message: error.message || 'Failed to create order',
      });
    }
  }

  @SubscribeMessage('update_table_status')
  async handleUpdateTableStatus(@MessageBody() data: { tableId: number; status: TableStatus }, @ConnectedSocket() client: Socket) {
    try {
      const table = await this.prisma.table.update({
        where: { id: data.tableId },
        data: { status: data.status },
      });
      this.server.emit('tableStatusUpdated', table);
      client.emit('update_table_status_response', { status: 'ok', table });
    } catch (error) {
      client.emit('update_table_status_response', {
        status: 'error',
        message: error.message || 'Failed to update table status',
      });
    }
  }

  @SubscribeMessage('update_order_item_status')
  async handleUpdateOrderItemStatus(@MessageBody() data: { itemId: number; status: OrderItemStatus }, @ConnectedSocket() client: Socket) {
    try {
      const orderItem = await this.orderService.updateOrderItemStatus(data.itemId, data.status);
      this.server.emit('orderItemStatusUpdated', orderItem);
      client.emit('update_order_item_status_response', { status: 'ok', orderItem });
    } catch (error) {
      client.emit('update_order_item_status_response', {
        status: 'error',
        message: error.message || 'Failed to update order item status',
      });
    }
  }

@SubscribeMessage('update_order_status')
async handleUpdateOrderStatus(@MessageBody() data: { orderId: number; status: OrderStatus }, @ConnectedSocket() client: Socket) {
  try {
    const updateOrderDto: UpdateOrderDto = {
      status: data.status,
      carrierNumber:''
      // Omit carrierNumber since it's optional and not provided in the input
    };
    const order = await this.orderService.update(data.orderId, updateOrderDto);
    this.server.emit('orderUpdated', order);
    client.emit('update_order_status_response', { status: 'ok', order });
  } catch (error) {
    client.emit('update_order_status_response', {
      status: 'error',
      message: error.message || 'Failed to update order status',
    });
  }
}

  notifyOrderCreated(order: any) {
    this.server.emit('orderCreated', order);
  }

  notifyOrderUpdated(order: any) {
    this.server.emit('orderUpdated', order);
  }

  notifyOrderDeleted(orderId: number) {
    this.server.emit('orderDeleted', { id: orderId });
  }

  notifyOrderItemStatusUpdated(orderItem: any) {
    this.server.emit('orderItemStatusUpdated', orderItem);
  }

  notifyOrderItemDeleted(orderItemId: number) {
    this.server.emit('orderItemDeleted', { id: orderItemId });
  }

  notifyTableStatusUpdated(table: any) {
    this.server.emit('tableStatusUpdated', table);
  }
}