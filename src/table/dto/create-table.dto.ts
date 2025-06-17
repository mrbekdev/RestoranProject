// dto/create-table.dto.ts
import { TableStatus } from "@prisma/client";
import { IsEnum, IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateTableDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsInt()
    @IsNotEmpty()
    number: string;
    @IsEnum(TableStatus)
    status:TableStatus
}


