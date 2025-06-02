import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderItemStatus } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // Frontend URL ni kerak bo'lsa shu yerga qo'ying
  },
})
@Injectable()
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  handleConnection(client: Socket) {
    const role = client.handshake.query.role as string;
    const restaurantId = client.handshake.query.restaurantId as string || 'default';
    if (role) {
      client.join(`${role}-${restaurantId}`);
      console.log(`Client ${client.id} joined room: ${role}-${restaurantId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('create_order')
  async handleCreateOrder(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      const order = await this.orderService.create(data);
      this.server
        .to(`kitchen-${data.restaurantId || 'default'}`)
        .to(`waiter-${data.restaurantId || 'default'}`)
        .emit('orderCreated', order);
      client.emit('create_order_response', { status: 'ok', order });
    } catch (error) {
      client.emit('create_order_response', {
        status: 'error',
        message: error.message || 'Failed to create order',
      });
    }
  }

  @SubscribeMessage('update_order_item_status')
  async handleUpdateOrderItemStatus(
    @MessageBody() data: { itemId: number; status: OrderItemStatus; restaurantId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const orderItem = await this.orderService.updateOrderItemStatus(data.itemId, data.status, data.restaurantId);
      this.server
        .to(`kitchen-${data.restaurantId || 'default'}`)
        .to(`waiter-${data.restaurantId || 'default'}`)
        .emit('orderItemStatusUpdated', orderItem);
      client.emit('update_order_item_status_response', { status: 'ok', orderItem });
    } catch (error) {
      client.emit('update_order_item_status_response', {
        status: 'error',
        message: error.message || 'Failed to update order item status',
      });
    }
  }

  @SubscribeMessage('update_order_status')
  async handleUpdateOrderStatus(
    @MessageBody() data: { orderId: number; status: OrderItemStatus; restaurantId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const order = await this.orderService.update(data.orderId, { status: data.status });
      this.server
        .to(`kitchen-${data.restaurantId || 'default'}`)
        .to(`waiter-${data.restaurantId || 'default'}`)
        .emit('orderUpdated', order);
      client.emit('update_order_status_response', { status: 'ok', order });
    } catch (error) {
      client.emit('update_order_status_response', {
        status: 'error',
        message: error.message || 'Failed to update order status',
      });
    }
  }

  notifyOrderCreated(order: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderCreated', order);
  }

  notifyOrderUpdated(order: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderUpdated', order);
  }

  notifyOrderDeleted(orderId: number, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderDeleted', { id: orderId });
  }

  notifyOrderItemStatusUpdated(orderItem: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderItemStatusUpdated', orderItem);
  }

  notifyOrderItemDeleted(orderItemId: number, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderItemDeleted', { id: orderItemId });
  }
}
