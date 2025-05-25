import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Status } from '../../../common/enums/status.enum';

@Entity()
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ type: 'enum', enum: Status, default: Status.ACTIVE })
  status: Status;
}
