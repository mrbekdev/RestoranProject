import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) { }
  async create(data: CreateCategoryDto) {
    return await this.prisma.category.create({
      data: { ...data },
    });
  }

  async findAll() {
    return await this.prisma.category.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.category.findUnique({ where: { id } });
  }

  async update(id: number, data: UpdateCategoryDto) {
    return await this.prisma.category.update({
      where: { id },
      data: { ...data },
    });
  }

  async remove(id: number) {
    return await this.prisma.category.delete({ where: { id } });
  }
}
