import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, OrderItemStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderGateway } from './order.gateway';
import { TableService } from '../table/table.service';

export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderGateway: OrderGateway,
    private readonly tableService: TableService,
  ) {}

  async create(data: CreateOrderDto) {
    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (table.status === 'busy') {
      throw new NotFoundException('Table is already occupied');
    }

    if (data.userId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    const productIds = [...new Set(data.products.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const totalPrice = data.products.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + Number(product?.price) * item.count;
    }, 0);

    const order = await this.prisma.order.create({
      data: {
        table: { connect: { id: data.tableId } },
        status: data.status || OrderStatus.PENDING,
        totalPrice,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        orderItems: {
          create: data.products.map((item) => ({
            product: { connect: { id: item.productId } },
            count: item.count,
            status: OrderItemStatus.PENDING,
          })),
        },
      },
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    this.orderGateway.notifyOrderCreated(order);
    return order;
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async update(id: number, data: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (data.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: data.tableId },
      });
      if (!table) {
        throw new NotFoundException('Table not found');
      }
    }

    if (data.userId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    let totalPrice = order.totalPrice;
    let orderItemsData;

    if (data.products) {
      const productIds = [...new Set(data.products.map((item) => item.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      totalPrice = data.products.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + Number(product?.price) * item.count;
      }, 0);

      await this.prisma.orderItem.deleteMany({
        where: { orderId: id },
      });

      orderItemsData = {
        create: data.products.map((item) => ({
          product: { connect: { id: item.productId } },
          count: item.count,
          status: OrderItemStatus.PENDING,
        })),
      };
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        table: data.tableId ? { connect: { id: data.tableId } } : undefined,
        status: data.status,
        totalPrice,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        orderItems: orderItemsData,
      },
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    this.orderGateway.notifyOrderUpdated(updatedOrder);
    return updatedOrder;
  }

  async updateOrderItemStatus(orderItemId: number, status: OrderItemStatus, restaurantId?: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        product: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const updatedOrderItem = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status,
        preparedAt: status === OrderItemStatus.READY ? new Date() : null,
      },
      include: {
        product: true,
        order: true,
      },
    });

    this.orderGateway.notifyOrderItemStatusUpdated(updatedOrderItem, restaurantId);
    await this.updateOrderStatusIfAllItemsReady(orderItem.orderId, restaurantId);
    return updatedOrderItem;
  }

  private async updateOrderStatusIfAllItemsReady(orderId: number, restaurantId?: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    if (orderItems.length === 0) return;

    const allReady = orderItems.every((item) => item.status === OrderItemStatus.READY);
    const hasCooking = orderItems.some((item) => item.status === OrderItemStatus.COOKING);

    if (allReady) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      });
      this.orderGateway.notifyOrderUpdated(updatedOrder, restaurantId);
    } else if (hasCooking) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COOKING },
      });
      this.orderGateway.notifyOrderUpdated(updatedOrder, restaurantId);
    }
  }

  async getKitchenOrders() {
    return await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.COOKING],
        },
      },
      include: {
        user: true,
        table: true,
        orderItems: {
          where: {
            status: {
              in: [OrderItemStatus.PENDING, OrderItemStatus.COOKING],
            },
          },
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getReadyItems() {
    return await this.prisma.orderItem.findMany({
      where: {
        status: OrderItemStatus.READY,
      },
      include: {
        product: true,
        order: {
          include: {
            user: true,
            table: true,
          },
        },
      },
    });
  }

  async remove(id: number, restaurantId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    const deletedOrder = await this.prisma.order.delete({
      where: { id },
    });

    this.orderGateway.notifyOrderDeleted(id, restaurantId);
    return deletedOrder;
  }

  async removeItem(id: number, restaurantId?: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id },
    });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const deletedOrderItem = await this.prisma.orderItem.delete({
      where: { id },
    });

    this.orderGateway.notifyOrderItemDeleted(id, restaurantId);
    await this.updateOrderStatusIfAllItemsReady(orderItem.orderId, restaurantId);
    return deletedOrderItem;
  }
}