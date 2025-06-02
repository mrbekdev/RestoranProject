import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderItemStatus } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust based on your frontend URL for security
  },
})
@Injectable()
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly orderService: OrderService ) {}

  // Handle client connection and assign to rooms
  handleConnection(client: Socket) {
    const role = client.handshake.query.role as string; // e.g., 'kitchen', 'waiter'
    const restaurantId = client.handshake.query.restaurantId as string; // For multi-tenant apps
    if (role) {
      client.join(`${role}-${restaurantId || 'default'}`);
      console.log(`Client ${client.id} joined room: ${role}-${restaurantId || 'default'}`);
    }
  }

  // Handle client disconnection
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Handle create_order event from frontend
  @SubscribeMessage('create_order')
  async handleCreateOrder(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    try {
      const order = await this.orderService.create(data);
      // Emit to kitchen and waiter rooms
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

  // Handle update_order_item_status event
  @SubscribeMessage('update_order_item_status')
  async handleUpdateOrderItemStatus(
    @MessageBody() data: { itemId: number; status: OrderItemStatus; restaurantId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const orderItem = await this.orderService.updateOrderItemStatus(data.itemId, data.status);
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

  // Handle update_order_status event
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

  // Notify all connected clients about a new order
  notifyOrderCreated(order: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderCreated', order);
  }

  // Notify all connected clients about an updated order
  notifyOrderUpdated(order: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderUpdated', order);
  }

  // Notify all connected clients about a deleted order
  notifyOrderDeleted(orderId: number, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderDeleted', { id: orderId });
  }

  // Notify all connected clients about an updated order item status
  notifyOrderItemStatusUpdated(orderItem: any, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderItemStatusUpdated', orderItem);
  }

  // Notify all connected clients about a deleted order item
  notifyOrderItemDeleted(orderItemId: number, restaurantId?: string) {
    this.server
      .to(`kitchen-${restaurantId || 'default'}`)
      .to(`waiter-${restaurantId || 'default'}`)
      .emit('orderItemDeleted', { id: orderItemId });
  }
}