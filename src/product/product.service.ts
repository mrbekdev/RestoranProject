import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Product } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto) {
    try {
      // Validate category if provided
      if (data.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: +data.categoryId },
        });
        if (!category) {
          throw new NotFoundException(`Category with ID ${data.categoryId} not found`);
        }
      }

      // Create product
      return await this.prisma.product.create({
        data: {
          name: data.name,
          price: data.price,
          image: data.image,
          date: data.date,
          category:{
            connect: { id: Number(data.categoryId) },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  async findAll() {
    return await this.prisma.product.findMany({
      include: {
        category: true,
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, data: UpdateProductDto) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Validate category if provided
      if (data.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: +data.categoryId },
        });
        if (!category) {
          throw new NotFoundException(`Category with ID ${data.categoryId} not found`);
        }
      }

      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          price: data.price,
          image: data.image,
          date: data.date,
          category: data.categoryId
            ? { connect: { id: +data.categoryId } }
            : data.categoryId === null
            ? { disconnect: true }
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product: ' + error.message);
    }
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return await this.prisma.product.delete({
      where: { id },
    });
  }
}