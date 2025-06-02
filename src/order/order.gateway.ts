// src/order/order.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this based on your frontend URL for security
  },
})
@Injectable()
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  // Notify all connected clients about a new order
  notifyOrderCreated(order: any) {
    this.server.emit('orderCreated', order);
  }

  // Notify all connected clients about an updated order
  notifyOrderUpdated(order: any) {
    this.server.emit('orderUpdated', order);
  }

  // Notify all connected clients about a deleted order
  notifyOrderDeleted(orderId: number) {
    this.server.emit('orderDeleted', { id: orderId });
  }

  // Notify all connected clients about an updated order item status
  notifyOrderItemStatusUpdated(orderItem: any) {
    this.server.emit('orderItemStatusUpdated', orderItem);
  }

  // Notify all connected clients about a deleted order item
  notifyOrderItemDeleted(orderItemId: number) {
    this.server.emit('orderItemDeleted', { id: orderItemId });
  }
}