import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly model: Model<ProductDocument>,
  ) {}

  async create(data: Partial<Product>): Promise<ProductDocument> {
    return this.model.create(data);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    inStock?: boolean;
    isNew?: boolean;
    isBestSeller?: boolean;
    sort?: string;
    exclude?: string;
  }) {
    const { page = 1, limit = 20, category, search, inStock, isNew, isBestSeller, sort, exclude } = params;

    const where: Record<string, unknown> = {};
    if (category)                  where.category     = { $regex: `^${category}$`, $options: 'i' };
    if (inStock !== undefined)     where.inStock       = inStock;
    if (isNew !== undefined)       where.isNew         = isNew;
    if (isBestSeller !== undefined) where.isBestSeller = isBestSeller;
    if (search)                    where.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    if (exclude) where._id = { $ne: exclude };

    const sortMap: Record<string, [string, 1 | -1][]> = {
      price_asc:  [['price', 1]],
      price_desc: [['price', -1]],
      popular:    [['reviews', -1], ['rating', -1]],
      newest:     [['createdAt', -1]],
    };
    const sortBy: [string, 1 | -1][] = sortMap[sort ?? ''] ?? [['createdAt', -1]];

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(where).sort(sortBy).skip(skip).limit(limit).exec(),
      this.model.countDocuments(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.model.findById(id).exec();
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Product ${id} not found`);
  }

  async getCategories(): Promise<string[]> {
    return this.model.distinct('category').exec();
  }

  async bulkCreate(items: Partial<Product>[]): Promise<{
    created: ProductDocument[];
    failed: { index: number; name: string; error: string }[];
  }> {
    const created: ProductDocument[] = [];
    const failed: { index: number; name: string; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const doc = await this.model.create(items[i]);
        created.push(doc);
      } catch (err: any) {
        failed.push({
          index: i,
          name: String(items[i].name ?? ''),
          error: err?.message ?? 'Unknown error',
        });
      }
    }

    return { created, failed };
  }
}
