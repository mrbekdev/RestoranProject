import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, OrderItemStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderGateway } from './order.gateway';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrderGateway))
    private readonly orderGateway: OrderGateway,
  ) {}

  async create(data: CreateOrderDto) {
    if (data.userId) {
      const customer = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    if (data.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: data.tableId },
      });
      if (!table) {
        throw new NotFoundException('Table not found');
      }
    }

    const productMap = new Map<number, number>();
    data.products.forEach((item) => {
      const existingCount = productMap.get(item.productId) || 0;
      productMap.set(item.productId, existingCount + item.count);
    });

    const productIds = Array.from(productMap.keys());
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { assignedTo: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    for (const product of products) {
      if (!product.assignedTo) {
        throw new NotFoundException(`No kitchen staff assigned to product ${product.name}`);
      }
    }

    const totalPrice = Array.from(productMap.entries()).reduce((sum, [productId, count]) => {
      const product = products.find((p) => p.id === productId);
      return sum + Number(product?.price) * count;
    }, 0);

    const order = await this.prisma.order.create({
      data: {
        table: data.tableId ? { connect: { id: data.tableId } } : undefined,
        status: OrderStatus.PENDING,
        totalPrice,
        carrierNumber: data.carrierNumber || null,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        uslug: data.uslug || null,
      },
      include: {
        user: true,
        table: true,
      },
    });

    const orderItems = await Promise.all(
      Array.from(productMap.entries()).map(async ([productId, count]) => {
        return this.prisma.orderItem.create({
          data: {
            order: { connect: { id: order.id } },
            product: { connect: { id: productId } },
            count,
            status: OrderItemStatus.PENDING,
          },
          include: {
            product: { include: { assignedTo: true } },
          },
        });
      })
    );

    const completeOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: { include: { assignedTo: true } },
          },
        },
      },
    });

    // Update table status to OCCUPIED if tableId is provided
    if (data.tableId) {
      const updatedTable = await this.prisma.table.update({
        where: { id: data.tableId },
        data: { status: TableStatus.busy },
      });
      this.orderGateway.notifyTableStatusUpdated(updatedTable);
    }

    orderItems.forEach((item) => {
      if (item.product.assignedTo) {
        this.orderGateway.notifyOrderItemAssigned(item);
      }
    });

    this.orderGateway.notifyOrderCreated(completeOrder);
    return completeOrder;
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: { include: { assignedTo: true } },
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
            product: { include: { assignedTo: true } },
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
      include: {
        orderItems: {
          include: {
            product: { include: { assignedTo: true } },
          },
        },
      },
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
      const productMap = new Map<number, number>();
      data.products.forEach((item) => {
        const existingCount = productMap.get(item.productId) || 0;
        productMap.set(item.productId, existingCount + item.count);
      });

      const productIds = Array.from(productMap.keys());
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { assignedTo: true },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      for (const product of products) {
        if (!product.assignedTo) {
          throw new NotFoundException(`No kitchen staff assigned to product ${product.name}`);
        }
      }

      const newItemsPrice = Array.from(productMap.entries()).reduce((sum, [productId, count]) => {
        const product = products.find((p) => p.id === productId);
        return sum + Number(product?.price) * count;
      }, 0);

      totalPrice = order.totalPrice + newItemsPrice;

      orderItemsData = {
        create: Array.from(productMap.entries()).map(([productId, count]) => ({
          product: { connect: { id: productId } },
          count,
          status: OrderItemStatus.PENDING,
        })),
      };
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        table: data.tableId ? { connect: { id: data.tableId } } : undefined,
        status: data.status || order.status,
        carrierNumber: data.carrierNumber !== undefined ? data.carrierNumber : order.carrierNumber,
        totalPrice,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        uslug: data.uslug !== undefined ? data.uslug : order.uslug,
        orderItems: orderItemsData,
      },
      include: {
        user: true,
        table: true,
        orderItems: {
          include: {
            product: { include: { assignedTo: true } },
          },
        },
      },
    });

    if (data.products) {
      await this.updateOrderStatusIfAllItemsReady(id);
      const newOrderItems = updatedOrder.orderItems.filter(item => item.status === OrderItemStatus.PENDING);
      newOrderItems.forEach((item) => {
        if (item.product.assignedTo) {
          this.orderGateway.notifyOrderItemAssigned(item);
        }
      });
    }

    this.orderGateway.notifyOrderUpdated(updatedOrder);
    return updatedOrder;
  }

  async updateOrderItemStatus(orderItemId: number, status: OrderItemStatus) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        product: { include: { assignedTo: true } },
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
        product: { include: { assignedTo: true } },
        order: true,
      },
    });

    this.orderGateway.notifyOrderItemStatusUpdated(updatedOrderItem);
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
    const hasPending = orderItems.some((item) => item.status === OrderItemStatus.PENDING);

    if (allReady) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
        include: {
          user: true,
          table: true,
          orderItems: {
            include: {
              product: { include: { assignedTo: true } },
            },
          },
        },
      });
      this.orderGateway.notifyOrderUpdated(updatedOrder);
    } else if (hasCooking) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COOKING },
        include: {
          user: true,
          table: true,
          orderItems: {
            include: {
              product: { include: { assignedTo: true } },
            },
          },
        },
      });
      this.orderGateway.notifyOrderUpdated(updatedOrder);
    } else if (hasPending) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PENDING },
        include: {
          user: true,
          table: true,
          orderItems: {
            include: {
              product: { include: { assignedTo: true } },
            },
          },
        },
      });
      this.orderGateway.notifyOrderUpdated(updatedOrder);
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
            product: { include: { assignedTo: true } },
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
        product: { include: { assignedTo: true } },
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
      include: { table: true },
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

    // Check if the table has other active orders
    if (order.tableId) {
      const remainingOrders = await this.prisma.order.count({
        where: {
          tableId: order.tableId,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.COOKING, OrderStatus.READY],
          },
        },
      });

      // If no active orders remain, set table status to FREE
      if (remainingOrders === 0) {
        const updatedTable = await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.empty },
        });
        this.orderGateway.notifyTableStatusUpdated(updatedTable);
      }
    }

    this.orderGateway.notifyOrderDeleted(id);
    return deletedOrder;
  }

  async removeItem(id: number) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id },
    });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const deletedOrderItem = await this.prisma.orderItem.delete({
      where: { id },
    });

    this.orderGateway.notifyOrderItemDeleted(id);
    await this.updateOrderStatusIfAllItemsReady(orderItem.orderId);
    return deletedOrderItem;
  }
}