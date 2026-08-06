export class ProductEntity {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  restaurantId: number;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(data: Partial<ProductEntity>) {
    this.id = data.id!;
    this.name = data.name!;
    this.description = data.description ?? null;
    this.imageUrl = data.imageUrl ?? null;
    this.restaurantId = data.restaurantId!;
    this.categoryId = data.categoryId ?? null;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
    this.deletedAt = data.deletedAt ?? null;
  }
}
