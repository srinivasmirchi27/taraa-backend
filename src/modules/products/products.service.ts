import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly model: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    return this.model.create(dto);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    inStock?: boolean;
  }) {
    const { page = 1, limit = 20, category, search, inStock } = params;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (inStock !== undefined) where.inStock = inStock;
    if (search) where.name = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
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
}
