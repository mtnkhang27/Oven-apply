import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity()
@Index(['productId', 'path'], { unique: true })
export class ProductAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn()
  product: Product;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column()
  path: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  extension: string;

  @Column()
  mimeType: string;

  @Column()
  storagePath: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}