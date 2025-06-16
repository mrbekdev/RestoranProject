import { Injectable } from '@nestjs/common';
import { CreatePercentDto } from './dto/create-percent.dto';
import { UpdatePercentDto } from './dto/update-percent.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PercentService {
  constructor(private readonly prisma:PrismaService){}
  create(createPercentDto: CreatePercentDto) {
    return this.prisma.percent.create({data:createPercentDto});
  }

  findAll() {
    return this.prisma.percent.findMany();
  }

  findOne(id: number) {
    return this.prisma.percent.findUnique({where:{id}});
  }

  update(id: number, updatePercentDto: UpdatePercentDto) {
    return this.prisma.percent.update({where:{id},data:updatePercentDto});
  }

  remove(id: number) {
    return this.prisma.percent.delete({where:{id}});
  }
}
