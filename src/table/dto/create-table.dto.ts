// dto/create-table.dto.ts
import { IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateTableDto {
    @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsInt()
    @IsNotEmpty()
    number: number;
}


