import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import { fixEslint, toCamelCase, toPascalCase, toSnakeCase } from './functions';

const moduleName = process.argv[2]; // ví dụ: advertisements
if (!moduleName) {
  console.error('❌ Vui lòng cung cấp module name!');
  process.exit(1);
}

const singular = pluralize.singular(moduleName); // advertisement
const className = toPascalCase(singular);
const classNamePlural = pluralize.plural(className); // Advertisements
const camelModuleName = toCamelCase(moduleName);
const snakeSingular = toSnakeCase(singular); // 'advertisement_image'

console.log('className', className);
console.log('classNamePlural', classNamePlural);
const controllerPath = path.join(
  __dirname,
  `../modules/${moduleName}/${moduleName}.controller.ts`,
);
const entityPath = path.join(
  __dirname,
  `../modules/${moduleName}/entities/${singular}.entity.ts`,
);

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Hàm tìm tất cả trường kết thúc _url trong entity, trả về mảng tên trường
function getUploadFields(entityContent: string): string[] {
  const regex = /^\s*(\w+)_url\s*:/gm;
  const fields: string[] = [];
  let match;
  while ((match = regex.exec(entityContent)) !== null) {
    fields.push(match[1]); // ví dụ 'avatar_url'
  }
  return fields;
}

let uploadFields: string[] = [];
if (fs.existsSync(entityPath)) {
  const entityContent = fs.readFileSync(entityPath, 'utf-8');
  uploadFields = getUploadFields(entityContent);
}

const hasUpload = uploadFields.length > 0;

// Tạo phần định nghĩa @UploadFiles([{ name: ..., maxCount: 1 }, ...])
const uploadFilesDecorator = hasUpload
  ? `@UploadFiles([${uploadFields
      .map((field) => `{ name: '${field}', maxCount: 1 }`)
      .join(', ')}], '${snakeSingular}')`
  : '';

// Tạo kiểu files parameter tương ứng
const filesParamType = hasUpload
  ? `{ ${uploadFields.map((f) => `${f}?: Multer.File[]`).join('; ')} }`
  : 'undefined';

let output = `import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ${hasUpload ? 'UploadedFiles,' : ''}
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ${classNamePlural}Service } from './${moduleName}.service';
import { Create${className}Dto } from './dto/create-${singular}.dto';
import { Update${className}Dto } from './dto/update-${singular}.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadFiles } from '../../common/decorators/upload.helper';
import { Multer } from 'multer';
import { ${className}FilterDto } from './dto/${singular}-filter.dto';

@Controller('${moduleName}')
export class ${classNamePlural}Controller {
  constructor(private readonly ${camelModuleName}Service: ${classNamePlural}Service) {}

  @ApiOperation({ summary: 'Get all ${classNamePlural} with filters' })
  @ApiResponse({ status: 200, description: 'List of ${classNamePlural}' })
  @Get()
  async findAll(@Query() query: ${className}FilterDto) {
    return await this.${camelModuleName}Service.findAll${classNamePlural}(query);
  }

  @ApiOperation({ summary: 'Create a new ${className}' })
  @ApiBody({ type: Create${className}Dto })
  @ApiResponse({ status: 201, description: '${className} created successfully' })`;

if (hasUpload) {
  output += `
  ${uploadFilesDecorator}
  @ApiConsumes('multipart/form-data')`;
}

output += `
  @Post()
  async create${className}(
    @Body() create${className}Dto: Create${className}Dto,`;

if (hasUpload) {
  output += `
    @UploadedFiles() files: ${filesParamType},`;
}

output += `
  ) {
    return await this.${camelModuleName}Service.create${className}(`;

if (hasUpload) {
  output += `create${className}Dto, files`;
} else {
  output += `create${className}Dto`;
}

output += `);
  }

  @ApiOperation({ summary: 'Update an existing ${className}' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the ${className} to update.',
    type: 'string',
    example: 1,
  })
  @ApiBody({
    description: 'Provide the updated data for the ${className}.',
    type: Update${className}Dto,
  })
  @ApiResponse({ status: 200, description: '${className} updated successfully.' })`;

if (hasUpload) {
  output += `
  ${uploadFilesDecorator}
  @ApiConsumes('multipart/form-data')`;
}

output += `
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() update${className}Dto: Update${className}Dto,`;

if (hasUpload) {
  output += `
    @UploadedFiles() files: ${filesParamType},`;
}

output += `
  ) {
    return await this.${camelModuleName}Service.update${className}(+id, update${className}Dto,`;

if (hasUpload) {
  output += `files`;
}

output += `);
  }

  @ApiOperation({ summary: 'Get a ${className} by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the ${className} to retrieve.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: '${className} retrieved successfully.' })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.${camelModuleName}Service.find${className}(+id);
  }

  @ApiOperation({ summary: 'Delete a ${className} by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the ${className} to delete.',
    type: 'string',
    example: 1,
  })
  @ApiResponse({ status: 200, description: '${className} deleted successfully.' })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.${camelModuleName}Service.remove${className}(+id);
  }
}
`;

fs.writeFileSync(controllerPath, output.trim());
console.log(`✅ Controller created at ${controllerPath}`);

fixEslint(controllerPath);
