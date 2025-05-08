import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Category } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto): Promise<Category> {
    try {
      return await this.prisma.category.create({
        data: {
          name: data.name,
          image: data.image,
          description: data.description,
        },
      });
    } catch (error) {
      throw new BadRequestException('Failed to create category: ' + error.message);
    }
  }

  async findAll() {
    return await this.prisma.category.findMany({
      include: {
        products: true,
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: number, data: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return await this.prisma.category.update({
        where: { id },
        data: {
          name: data.name,
          image: data.image,
          description: data.description,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update category: ' + error.message);
    }
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return await this.prisma.category.delete({
      where: { id },
    });
  }
}