import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'original_price' })
  originalPrice: number;

  @Column({ default: 0 })
  discount: number;

  @Column({ name: 'image_url' })
  image: string;

  @Column('simple-array', { name: 'image_urls', nullable: true })
  images: string[];

  @Column({ nullable: true })
  badge: string;

  @Column('text')
  description: string;

  @Column({ default: true, name: 'in_stock' })
  inStock: boolean;

  @Column('decimal', { precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviews: number;

  @Column({ default: false, name: 'is_new' })
  isNew: boolean;

  @Column({ default: false, name: 'is_best_seller' })
  isBestSeller: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
