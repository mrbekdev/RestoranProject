import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash } from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }
  async create(data: CreateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (user) {
      throw new BadRequestException('User alredy exist');
    }

    return await this.prisma.user.create({
      data: { ...data, role: data.role,phone: data.phone,password:data.password },
    });
  }

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: number, data: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      data: { ...data,role: data.role },
    });
  }

  async remove(id: number) {
    return await this.prisma.user.delete({ where: { id } });
  }
}


const RoleStructure = [
  {
    id:1,
    role: 'ADMIN',
    name:"Admin saralash"
  },
  {
    id:1,
    role: 'ADMIN',
    name:"Admin saralash"
  },
  {
    id:1,
    role: 'ADMIN',
    name:"Admin saralash"
  },
  {
    id:1,
    role: 'ADMIN',
    name:"Admin saralash"
  },
  {
    id:1,
    role: 'ADMIN',
    name:"Admin saralash"
  }
]