import { Role } from "@prisma/client";
import { IsEnum } from "class-validator";

export class CreateUserDto {
  name: string;
  surname: string;
  username: string;
  password: string;
  @IsEnum(Role)
  role: Role;
  phone: string;
}
