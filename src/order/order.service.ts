import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, OrderItemStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: CreateOrderDto) {
    // Foydalanuvchi mavjudligini tekshirish
    const customer = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Mahsulotlar mavjudligini tekshirish va totalPrice hisoblash
    let totalPrice = 0;
    // Takrorlanmaydigan productId larni olish
    const productIds = [...new Set(data.products.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Agar barcha mahsulotlar topilmasa
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // TotalPrice ni hisoblash
    for (const item of data.products) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
      totalPrice += Number(product.price) * item.count;
    }

    // Order yaratish
    return await this.prisma.order.create({
      data: {
        tableNumber: data.tableNumber,
        status: data.status as OrderStatus,
        totalPrice,
        user: { connect: { id: data.userId } },
        orderItems: {
          create: data.products.map((item) => ({
            productId: item.productId,
            count: item.count,
            status: OrderItemStatus.PENDING,
          })),
        },
      },
      include: {
        user: true,
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
      where: { id: +id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Agar products berilgan bo'lsa, totalPrice ni qayta hisoblash
    let totalPrice = +order.totalPrice;
    if (data.products) {
      // Takrorlanmaydigan productId larni olish
      const productIds = [...new Set(data.products.map((item) => item.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      // Agar barcha mahsulotlar topilmasa
      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more products not found');
      }

      // TotalPrice ni hisoblash
      totalPrice = 0;
      for (const item of data.products) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }
        totalPrice += Number(product.price) * item.count;
      }

      // Eski OrderItem'larni o'chirish
      await this.prisma.orderItem.deleteMany({
        where: { orderId: +id },
      });
    }

    return await this.prisma.order.update({
      where: { id },
      data: {
        tableNumber: data.tableNumber,
        status: data.status,
        totalPrice: totalPrice,
        user: data.userId ? { connect: { id: data.userId } } : undefined,
        orderItems: data.products
          ? {
              create: data.products.map((item) => ({
                productId: item.productId,
                count: item.count,
                status: OrderItemStatus.PENDING,
              })),
            }
          : undefined,
      },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // Mahsulot statusini o'zgartirish
  async updateOrderItemStatus(orderItemId: number, status: OrderItemStatus) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { 
        order: true,
        product: true
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Order item statusini yangilash
    const updatedOrderItem = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        status,
        preparedAt: status === OrderItemStatus.READY ? new Date() : undefined,
      },
      include: {
        product: true,
        order: true,
      },
    });

    // Barcha order item'lar tayyor bo'lganda order statusini yangilash
    await this.updateOrderStatusIfAllItemsReady(orderItem.orderId);

    return updatedOrderItem;
  }

  // Barcha mahsulotlar tayyor bo'lganda order statusini yangilash
  private async updateOrderStatusIfAllItemsReady(orderId: number) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    const allReady = orderItems.every(item => item.status === OrderItemStatus.READY);
    
    if (allReady && orderItems.length > 0) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY },
      });
    } else if (orderItems.some(item => item.status === OrderItemStatus.COOKING)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COOKING },
      });
    }
  }

  // Kitchen uchun - pishirilayotgan mahsulotlarni ko'rish
  async getKitchenOrders() {
    return await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.COOKING],
        },
      },
      include: {
        user: true,
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

  // Tayyor mahsulotlarni ko'rish
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

    // OrderItem'larni o'chirish
    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    return await this.prisma.order.delete({
      where: { id },
    });
  }
}