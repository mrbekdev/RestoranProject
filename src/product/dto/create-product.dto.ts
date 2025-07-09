export class CreateProductDto {
  name: string;
  price: number;
  image?: string;
  date?: string;
  categoryId?: number;
  assignedToId?: number;
  index?: string;
  isFinished?: boolean;
}