import {
  Repository,
  FindOneOptions,
  ObjectLiteral,
  FindOptionsWhere,
  SelectQueryBuilder,
  DeepPartial,
} from 'typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handleDatabaseError } from '../../utils/handle-db-error';
import { createFilteredQueryBuilder } from '../../utils/query-builder';
import { applyPaginationAndFilters } from '../../utils/typeorm-query.util';
import {
  getPaginationParams,
  formatPaginationResult,
} from '../../common/helper/pagination.helper';
import { addCondition } from '../../common/helper/add-query-condition.helper';
import { Multer } from 'multer';
import { deleteFile } from '../helper/file.helper';
import { getCurrentLang } from '../helper/lang.helper';
import { ApiGatewayTimeoutResponse } from '@nestjs/swagger';
import { Language } from '../../modules/languages/entities/language.entity';

@Injectable()
export class BaseService<Entity extends ObjectLiteral> {
  constructor(
    protected readonly repository: Repository<Entity>,
    protected readonly alias: string,
    protected readonly defaultRelations: string[] = [],
  ) {}

  protected applyCustomFilter(
    queryBuilder: SelectQueryBuilder<any>,
    query: any,
  ): void {}

  protected getSkippedFilterKeys(): string[] {
    return [];
  }

  protected buildQuery(
    query: any,
    relations: string[] = [],
  ): SelectQueryBuilder<Entity> {
    const lang = getCurrentLang();
    const queryBuilder = this.repository.createQueryBuilder(this.alias);

    // 🏷️ 1. Join translations nếu có
    const hasTranslationRelation =
      this.repository.metadata.findRelationWithPropertyPath('translations');

    if (hasTranslationRelation) {
      queryBuilder
        .leftJoinAndSelect(`${this.alias}.translations`, 'translation')
        .leftJoinAndSelect('translation.language', 'language')
        .andWhere('language.code = :lang', { lang });
    }

    // 🧩 2. Join các quan hệ mặc định
    relations.forEach((relation) => {
      const relationMetadata =
        this.repository.metadata.findRelationWithPropertyPath(relation);
      if (relationMetadata) {
        queryBuilder.leftJoinAndSelect(`${this.alias}.${relation}`, relation);
        const relationTarget = relationMetadata.inverseEntityMetadata;
        const hasTranslation =
          relationTarget.findRelationWithPropertyPath('translations');
        if (hasTranslation) {
          const translationAlias = `${relation}Translation`;
          const languageAlias = `${translationAlias}Lang`;
          queryBuilder
            .leftJoinAndSelect(`${relation}.translations`, translationAlias)
            .leftJoinAndSelect(`${translationAlias}.language`, languageAlias)
            .andWhere(`${languageAlias}.code = :lang`, { lang });
        }
      } else {
        console.warn(
          `⚠️ Relation "${relation}" không tồn tại trong entity "${this.repository.metadata.name}"`,
        );
      }
    });

    // 🎯 3. Gọi custom filter từ subclass
    this.applyCustomFilter(queryBuilder, query);

    // 🎚️ 4. Áp dụng các filter mặc định
    const skippedKeys = this.getSkippedFilterKeys();
    Object.keys(query).forEach((key) => {
      if (
        query[key] !== undefined &&
        ![
          'page',
          'entry',
          'sort',
          'field',
          'offset',
          'filters',
          ...skippedKeys,
        ].includes(key)
      ) {
        if (key.endsWith('From')) {
          addCondition(
            queryBuilder,
            key.replace('From', ''),
            query[key],
            this.alias,
            '>=',
            'from',
          );
        } else if (key.endsWith('To')) {
          addCondition(
            queryBuilder,
            key.replace('To', ''),
            query[key],
            this.alias,
            '<=',
            'to',
          );
        } else {
          addCondition(queryBuilder, key, query[key], this.alias);
        }
      }
    });

    return queryBuilder;
  }

  async findAll(query: any, relations: string[] = []) {
    try {
      const { page, entry, sort, field, offset } = getPaginationParams(query);
      const qb = this.buildQuery(query, relations);

      applyPaginationAndFilters(qb, offset, entry, field, sort, this.alias);

      const data = await qb.getMany();
      const total = await qb.getCount();

      return formatPaginationResult(data, page, entry, total);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async create(
    createDto: any,
    files?: Record<string, Multer.File[]>,
  ): Promise<Entity> {
    try {
      // Xử lý quan hệ nếu có
      this.defaultRelations.forEach((key) => {
        const relationKey = key + 'Id';
        if (Object.prototype.hasOwnProperty.call(createDto, relationKey)) {
          createDto[key] = { id: createDto[relationKey] };
          delete createDto[relationKey];
        }
      });

      // Xử lý ảnh nếu có
      if (files) {
        Object.keys(files).forEach((key) => {
          const uploadedFiles = files[key];
          if (uploadedFiles && uploadedFiles.length > 0) {
            // Nếu có nhiều ảnh, có thể lưu dưới dạng mảng URL hoặc lấy ảnh đầu tiên
            const fileUrls = uploadedFiles.map(
              (file) => `/uploads/${this.alias}/${file.filename}`,
            );
            createDto[`${key}_url`] =
              fileUrls.length === 1 ? fileUrls[0] : fileUrls.join(',');
          }
        });
      }

      if (createDto.translations) {
        for (const translation of createDto.translations) {
          if (translation.languageId) {
            const language = await this.repository.manager.findOne(Language, {
              where: { id: translation.languageId },
            });
            if (language) {
              translation.language = language; // Gán đối tượng Language vào translation
              delete translation.languageId; // Xóa languageId sau khi đã gán
            } else {
              throw new NotFoundException(
                `Language with ID ${translation.languageId} not found`,
              );
            }
          }
        }
      }
      const entity = this.repository.create(createDto);
      return (await this.repository.save(entity)) as unknown as Entity;
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  /**
   * Creates multiple entities in bulk.
   * Does NOT handle file uploads or translations.
   * Handles simple relationship mapping via `xxxId` properties based on `defaultRelations`.
   * @param createDtos - An array of DTOs for the entities to create.
   * @returns A promise resolving to an array of the created entities.
   */
  async createMany(createDtos: DeepPartial<Entity>[]): Promise<Entity[]> {
    try {
      const processedDtos = createDtos.map((dto) => {
        const processedDto = { ...dto }; // Work on a copy
        // Handle relationships based on defaultRelations
        this.defaultRelations.forEach((key) => {
          const relationKey = key + 'Id';
          const relationId = processedDto[relationKey];
          if (relationId !== undefined && relationId !== null) {
            processedDto[key] = { id: relationId };
            delete processedDto[relationKey];
          }
        });
        return processedDto;
      });

      // Create multiple entity instances
      const entities = this.repository.create(processedDtos);

      // Save all entities in a single transaction (if supported by the driver)
      return await this.repository.save(entities);
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  async update(
    id: number,
    updateDto: any,
    files?: Record<string, Multer.File[]>,
  ): Promise<Entity> {
    try {
      const relations = [...this.defaultRelations];
      console.log('update');
      // ✅ Thêm quan hệ 'translations' nếu có
      console.log('updateDto.translations', updateDto.translations);

      if (
        this.repository.metadata.relations.some(
          (r) => r.propertyName === 'translations',
        ) &&
        !relations.includes('translations')
      ) {
        relations.push('translations');
      }

      const entity = await this.findOne(id, { relations });

      if (!entity) {
        throw new NotFoundException(`Entity with ID ${id} not found`);
      }

      // ✅ Xử lý các quan hệ có khóa ngoại (xxxId)
      this.defaultRelations.forEach((key) => {
        const relationKey = key + 'Id';
        if (updateDto[relationKey]) {
          updateDto[key] = { id: updateDto[relationKey] };
          delete updateDto[relationKey];
        }
      });

      // ✅ Chỉ xử lý translations nếu được gửi lên và là mảng hợp lệ
      if (
        Array.isArray(updateDto.translations) &&
        updateDto.translations.length > 0
      ) {
        // Xoá bản dịch cũ
        if (entity.translations && entity.translations.length > 0) {
          await this.repository.manager.remove(entity.translations);
        }

        // Tạo translations mới
        updateDto.translations = await Promise.all(
          updateDto.translations.map(async (translation: any) => {
            if (!translation.languageId) return translation;

            const language = await this.repository.manager.findOne(Language, {
              where: { id: translation.languageId },
            });

            if (!language) {
              throw new NotFoundException(
                `Language with ID ${translation.languageId} not found`,
              );
            }

            const mergedTranslation = {
              ...translation,
              language,
              entity,
            };

            delete mergedTranslation.languageId;
            return mergedTranslation;
          }),
        );
      } else {
        // Nếu không gửi lên thì không đụng tới translations
        delete updateDto.translations;
      }

      // ✅ Xử lý file upload
      if (files) {
        Object.keys(files).forEach((key) => {
          const uploadedFiles = files[key];
          if (uploadedFiles && uploadedFiles.length > 0) {
            const oldFileUrl = entity[`${key}_url`];
            if (oldFileUrl) {
              deleteFile(oldFileUrl);
            }

            const fileUrls = uploadedFiles.map(
              (file) => `/uploads/${this.alias}/${file.filename}`,
            );

            updateDto[`${key}_url`] =
              fileUrls.length === 1 ? fileUrls[0] : fileUrls.join(',');
          }
        });
      }

      // ✅ Gộp updateDto vào entity
      Object.assign(entity, updateDto);

      // ✅ Lưu entity
      const result = await this.repository.save(entity);

      // ✅ Xoá vòng lặp circular để tránh lỗi khi trả response
      if (result.translations) {
        result.translations.forEach((t) => {
          delete t.entity;
        });
      }

      const updatedEntity = await this.findOne(id, { relations });
      return updatedEntity as unknown as Entity;
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  /**
   * Updates multiple entities in bulk based on their IDs.
   * Does NOT handle file uploads or translations.
   * Handles simple relationship mapping via `xxxId` properties based on `defaultRelations`.
   * Throws NotFoundException if any entity ID is not found.
   * @param updates - An array of objects, each containing the `id` of the entity to update and the `data` (DTO) to apply.
   * @returns A promise resolving to an array of the updated entities.
   */
  async updateMany(
    updates: { id: number; data: DeepPartial<Entity> }[],
  ): Promise<Entity[]> {
    try {
      const updatedEntities: Entity[] = [];
      const entitiesToSave: DeepPartial<Entity>[] = []; // Use DeepPartial for saving

      // Validate all entities exist first (optional but good practice for atomicity)
      const idsToUpdate = updates.map((u) => u.id);
      const existingEntities = await this.repository.findByIds(idsToUpdate);
      if (existingEntities.length !== updates.length) {
        const foundIds = existingEntities.map((e) => e.id);
        const notFoundIds = idsToUpdate.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Entities with IDs ${notFoundIds.join(', ')} not found`,
        );
      }
      const existingEntityMap = new Map(existingEntities.map((e) => [e.id, e]));

      for (const update of updates) {
        const { id, data } = update;
        const entity = existingEntityMap.get(id); // Get pre-fetched entity

        // This check is technically redundant due to the check above, but good for clarity
        if (!entity) {
          throw new NotFoundException(
            `Entity with ID ${id} not found (this should not happen after initial check)`,
          );
        }

        const processedData = { ...data }; // Work on a copy

        // Handle relationships based on defaultRelations
        this.defaultRelations.forEach((key) => {
          const relationKey = key + 'Id';
          const relationId = (processedData as any)[relationKey];
          // Check if the property exists in the input data
          if (
            Object.prototype.hasOwnProperty.call(processedData, relationKey)
          ) {
            // Allow setting relation to null or an object with id
            (processedData as any)[key] =
              relationId === null || relationId === undefined
                ? null
                : { id: relationId };
            delete (processedData as any)[relationKey];
          }
        });

        // Prepare the object for saving. Crucially include the ID.
        entitiesToSave.push({
          ...processedData, // Apply updates
          id: entity.id, // Ensure the ID is present for the update operation
        } as DeepPartial<Entity>); // Cast needed as we added 'id' potentially
      }

      // Save all entities - TypeORM's save will update based on the included 'id'
      // It's generally recommended to fetch updated entities again if you need relations populated
      const results = await this.repository.save(entitiesToSave);
      return results as Entity[];

      // If you need relations populated in the return value, you'd need to re-fetch:
      // const savedIds = results.map(r => r.id);
      // return this.repository.findByIds(savedIds, { relations: this.defaultRelations });
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  async findOne(
    id: number,
    options?: Omit<FindOneOptions<Entity>, 'where'>,
  ): Promise<Entity | null> {
    try {
      const lang = getCurrentLang();

      // Đảm bảo relations là một mảng hoặc undefined
      const relations = options?.relations
        ? Object.values(options.relations)
        : this.defaultRelations;
      console.log('relations', relations);

      const shouldFilterTranslations = relations.includes('translations');

      const queryBuilder = this.repository
        .createQueryBuilder(this.alias)
        .where(`${this.alias}.id = :id`, { id });

      if (shouldFilterTranslations) {
        queryBuilder
          .leftJoinAndSelect(`${this.alias}.translations`, 'translation')
          .leftJoinAndSelect('translation.language', 'language');
        // .andWhere('language.code = :lang', { lang });
      }

      const entityMetadata = this.repository.metadata;
      relations.forEach((relation) => {
        if (relation === 'translations') return;
        const relationExists = entityMetadata.relations.some(
          (r) => r.propertyName === relation,
        );
        if (relationExists) {
          queryBuilder.leftJoinAndSelect(`${this.alias}.${relation}`, relation);
        } else {
          console.warn(
            `⚠️ Relation "${relation}" does not exist in entity "${entityMetadata.name}"`,
          );
        }
      });
      console.log(queryBuilder.getSql());

      const entity = await queryBuilder.getOne();
      console.log(entity);
      if (!entity) {
        throw new NotFoundException(`Entity with ID ${id} not found`);
      }
      return entity;
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  async count(queryBuilder: SelectQueryBuilder<any>): Promise<number> {
    try {
      const countQueryBuilder = queryBuilder.clone();
      return await countQueryBuilder.getCount();
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }

  async countAll(): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder(this.alias);
    return this.count(queryBuilder);
  }

  async remove(id: number): Promise<string> {
    try {
      const entity = await this.findOne(id);
      if (!entity) {
        throw new NotFoundException(`Entity with ID ${id} not found`);
      }

      // Xóa hình ảnh nếu có
      Object.keys(entity).forEach((key) => {
        if (key.endsWith('_url')) {
          const filePath = entity[key];
          if (filePath) {
            deleteFile(filePath); // Gọi hàm xóa hình ảnh
          }
        }
      });

      await this.repository.remove(entity);
      return `Entity with ID ${id} has been removed`;
    } catch (error) {
      handleDatabaseError(error);
      throw error;
    }
  }
}
