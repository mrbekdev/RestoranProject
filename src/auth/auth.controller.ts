import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';

@Controller('login')
export class AuthController {
  constructor(private readonly loginService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async login(@Body() dto: CreateAuthDto) {
    return this.loginService.login(dto);
  }
}
