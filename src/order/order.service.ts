import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, OrderItemStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderDto) {
    // Validate table existence
    const table = await this.prisma.table.findUnique({
      where: { id: data.tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Validate user if provided
    if (data.userId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Validate products
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

    // Create order
    return await this.prisma.order.create({
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

    // Validate table if provided
    if (data.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: data.tableId },
      });
      if (!table) {
        throw new NotFoundException('Table not found');
      }
    }

    // Validate user if provided
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

      // Delete existing order items
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

    return await this.prisma.order.update({
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
  }

  async updateOrderItemStatus(orderItemId: number, status: OrderItemStatus) {
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

    await this.updateOrderStatusIfAllItemsReady(orderItem.orderId);

    return updatedOrderItem;
  }

  private async updateOrderStatusIfAllItemsReady(orderId: number) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    if (orderItems.length === 0) return;

    const allReady = orderItems.every((item) => item.status === OrderItemStatus.READY);
    const hasCooking = orderItems.some((item) => item.status === OrderItemStatus.COOKING);

    if (allReady) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      });
    } else if (hasCooking) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COOKING },
      });
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

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    return await this.prisma.order.delete({
      where: { id },
    });
  }
  async removeItem(id: number) {
    const order = await this.prisma.orderItem.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return await this.prisma.orderItem.delete({
      where: { id },
    });
  }
  

}