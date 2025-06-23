import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) { }

  async login(dto: CreateAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.password !== user.password) {
      throw new UnauthorizedException('Invalid password');
    }

    return {
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          surname: user.surname,
          username: user.username,
          role: user.role,
        },
      },
    };
  }
}
