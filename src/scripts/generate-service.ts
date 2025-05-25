import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import { exec } from 'child_process';
import { fixEslint, toCamelCase, toPascalCase, toSnakeCase } from './functions';

const moduleName = process.argv[2];
const hasUpload = process.argv.includes('--hasUpload');

if (!moduleName) {
  console.error('❌ Vui lòng cung cấp module name!');
  process.exit(1);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractManyToOneFields(content: string): string[] {
  const lines = content.split('\n');
  const relationFields: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('@ManyToOne')) {
      let j = i + 1;

      while (
        j < lines.length &&
        (lines[j].trim().startsWith('@') ||
          lines[j].trim().endsWith(',') ||
          lines[j].includes('onDelete') ||
          lines[j].includes('JoinColumn') ||
          lines[j].trim().startsWith('{') ||
          lines[j].trim().startsWith('}') ||
          lines[j].trim() === '')
      ) {
        j++;
      }

      const fieldLine = lines[j]?.trim();
      const match = fieldLine?.match(/^(\w+)\s*:/);
      if (match) {
        relationFields.push(match[1]);
      }
    }
  }

  return relationFields;
}

/**
 * Bổ sung hàm extract upload fields từ controller
 * Đọc file controller, lấy tất cả các name trong @UploadFiles([...])
 */
function extractUploadFieldsFromController(content: string): string[] {
  const regex = /@UploadFiles\(\s*\[\s*([\s\S]*?)\s*\],\s*['"`][\w-]+['"`]\s*\)/gm;
  const fields = new Set<string>();

  let match;
  while ((match = regex.exec(content)) !== null) {
    const arrBlock = match[1]; // nội dung mảng [{ name: 'xxx', ... }, ...]
    const nameMatches = [...arrBlock.matchAll(/name\s*:\s*['"`](\w+)['"`]/g)];
    nameMatches.forEach(m => fields.add(m[1]));
  }

  return Array.from(fields);
}

const singular = pluralize.singular(moduleName);
const className = toPascalCase(singular);
const classNamePlural = pluralize.plural(className);
const camelModuleName = toCamelCase(moduleName);
const snakeSingular = toSnakeCase(singular); // 'advertisement_image'
const servicePath = path.join(
  __dirname,
  `../modules/${moduleName}/${moduleName}.service.ts`,
);
const entityPath = path.join(
  __dirname,
  `../modules/${moduleName}/entities/${singular}.entity.ts`,
);
const controllerPath = path.join(
  __dirname,
  `../modules/${moduleName}/${moduleName}.controller.ts`,
);

let relationFields: string[] = [];
if (fs.existsSync(entityPath)) {
  const entityContent = fs.readFileSync(entityPath, 'utf-8');
  relationFields = extractManyToOneFields(entityContent);
}

let uploadFields: string[] = [];
if (hasUpload && fs.existsSync(controllerPath)) {
  const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
  uploadFields = extractUploadFieldsFromController(controllerContent);
}

// Tạo string param files với các trường upload, ví dụ: image?: Multer.File[]; banner?: Multer.File[]
const filesParamString = uploadFields.length > 0
  ? uploadFields.map(f => `${f}?: Multer.File[]`).join('; ')
  : 'picture?: Multer.File[]';

let output = `import { Injectable } from '@nestjs/common';
import { Create${className}Dto } from './dto/create-${singular}.dto';
import { Update${className}Dto } from './dto/update-${singular}.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${className} } from './entities/${singular}.entity';
import { BaseService } from '../../common/services/base.service';
import { ${className}FilterDto } from './dto/${singular}-filter.dto';`;

if (hasUpload) {
  output += `
import { Multer } from 'multer';`;
}

output += `

@Injectable()
export class ${classNamePlural}Service extends BaseService<${className}> {
  constructor(
    @InjectRepository(${className})
    repository: Repository<${className}>,
  ) {
    super(repository, '${snakeSingular}', [${relationFields.map((r) => `'${r}'`).join(', ')}]);
  }

  async findAll${classNamePlural}(query: ${className}FilterDto) {
    return this.findAll(query);
  }
`;

if (hasUpload) {
  output += `
  async create${className}(
    create${className}Dto: Create${className}Dto,
    files: { ${filesParamString} },
  ): Promise<${className}> {
    return this.create(create${className}Dto, files);
  }

  async update${className}(
    id: number,
    update${className}Dto: Update${className}Dto,
    files: { ${filesParamString} },
  ): Promise<${className}> {
    return this.update(id, update${className}Dto, files);
  }
`;
} else {
  output += `
  async create${className}(
    create${className}Dto: Create${className}Dto,
  ): Promise<${className}> {
    return this.create(create${className}Dto);
  }

  async update${className}(
    id: number,
    update${className}Dto: Update${className}Dto,
  ): Promise<${className}> {
    return this.update(id, update${className}Dto);
  }
`;
}

output += `
  async find${className}(id: number): Promise<${className} | null> {
    return await this.findOne(id);
  }

  async remove${className}(id: number) {
    await this.remove(id);
  }
}
`;

fs.writeFileSync(servicePath, output.trim());
console.log(`✅ Service created at ${servicePath}`);

exec(`npx eslint --fix ${controllerPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ ESLint fix error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`❌ ESLint fix stderr: ${stderr}`);
  }
  console.log(`✅ ESLint auto-fixed file at ${controllerPath}`);
});

fixEslint(servicePath);
