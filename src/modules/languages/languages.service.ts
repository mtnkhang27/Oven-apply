import { Injectable } from '@nestjs/common';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { BaseService } from '../../common/services/base.service';
import { LanguageFilterDto } from './dto/language-filter.dto';

@Injectable()
export class LanguagesService extends BaseService<Language> {
  constructor(
    @InjectRepository(Language)
    repository: Repository<Language>,
  ) {
    super(repository, 'language');
  }

  async findAllLanguages(query: LanguageFilterDto) {
    return this.findAll(query);
  }

  async createLanguage(
    createLanguageDto: CreateLanguageDto,
  ): Promise<Language> {
    return this.create(createLanguageDto);
  }

  async updateLanguage(
    id: number,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<Language> {
    return this.update(id, updateLanguageDto);
  }

  async findLanguage(id: number): Promise<Language | null> {
    return await this.findOne(id);
  }

  async removeLanguage(id: number) {
    await this.remove(id);
  }
}
