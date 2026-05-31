import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly model: Model<CategoryDocument>,
    @InjectModel(Product.name)  private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.model.findOne({ slug: dto.slug.toLowerCase() });
    if (existing) throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
    return this.model.create(dto);
  }

  async findAll(onlyActive = true): Promise<object[]> {
    const filter = onlyActive ? { isActive: true } : {};
    const categories = await this.model.find(filter).sort({ sortOrder: 1, name: 1 }).exec();

    // Count products per category in one aggregation
    const counts: { _id: string; count: number }[] = await this.productModel.aggregate([
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map(c => [c._id, c.count]));

    return categories.map(cat => ({
      ...cat.toJSON(),
      count: countMap.get(cat.name.toLowerCase()) ?? 0,
    }));
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const cat = await this.model.findById(id).exec();
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const cat = await this.model.findOne({ slug: slug.toLowerCase() }).exec();
    if (!cat) throw new NotFoundException(`Category "${slug}" not found`);
    return cat;
  }

  async update(id: string, data: Partial<CreateCategoryDto>): Promise<CategoryDocument> {
    const cat = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async remove(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Category ${id} not found`);
  }
}
