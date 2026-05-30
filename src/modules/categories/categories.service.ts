import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly model: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.model.findOne({ slug: dto.slug.toLowerCase() });
    if (existing) throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
    return this.model.create(dto);
  }

  async findAll(onlyActive = false): Promise<CategoryDocument[]> {
    const filter = onlyActive ? { isActive: true } : {};
    return this.model.find(filter).sort({ sortOrder: 1, name: 1 }).exec();
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
