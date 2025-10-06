import { Project, StructureKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import { toPascalCase } from './functions';

function isEnumTypeNode(prop): boolean {
  const type = prop.getType();
  const symbol = type.getSymbol();
  if (!symbol) return false;

  const declarations = symbol.getDeclarations();
  return declarations.some((decl) => decl.getKindName() === 'EnumDeclaration');
}

function cleanType(typeText: string): string {
  const match = typeText.match(/import\(".*"\)\.(.*)/);
  return match ? match[1] : typeText;
}

function getRelationType(prop): string | null {
  const decorators = prop.getDecorators();
  for (const dec of decorators) {
    const name = dec.getName();
    if (['OneToOne', 'ManyToOne', 'OneToMany', 'ManyToMany'].includes(name)) {
      return name;
    }
  }
  return null;
}

function isRelationProperty(prop) {
  const type = prop.getType();
  const symbol = type.getSymbol();
  if (!symbol) return false;
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return false;
  return declarations.some((decl) =>
    decl.getSourceFile().getFilePath().includes('/entities/'),
  );
}

const moduleName = process.argv[2];
const singularModuleName = pluralize.singular(moduleName);
const className = toPascalCase(singularModuleName);
const classNamePlural = pluralize.plural(className);
console.log('singularModule', singularModuleName);

if (!singularModuleName) {
  console.error(
    '❌ Missing module name. Example: npm run generate-dto utility',
  );
  process.exit(1);
}

const entityPath = path.join(
  __dirname,
  `../modules/${moduleName}/entities/${singularModuleName}.entity.ts`,
);
const dtoDir = path.join(__dirname, `../modules/${moduleName}/dto`);
const createDtoFile = path.join(dtoDir, `create-${singularModuleName}.dto.ts`);
const filterDtoFile = path.join(dtoDir, `${singularModuleName}-filter.dto.ts`);

if (!fs.existsSync(entityPath)) {
  console.error(`❌ Entity not found: ${entityPath}`);
  process.exit(1);
}

const project = new Project();
const sourceFile = project.addSourceFileAtPath(entityPath);
const entityClass = sourceFile.getClasses()[0];
const properties = entityClass.getProperties();
const importDeclarations = sourceFile.getImportDeclarations();

const excludeFields = ['id', 'createdAt', 'updatedAt', 'deletedAt'];
const usedEnums = new Set<string>();
const usedEnumImports = new Map<string, string>();

function getDecorator(type: string, optional = false): string[] {
  const decorators: string[] = [];
  if (type === 'number') {
    decorators.push(
      optional ? '@IsOptional()\n  @IsPositive()' : '@IsPositive()',
    );
  } else if (type === 'string') {
    decorators.push(optional ? '@IsOptional()\n  @IsString()' : '@IsString()');
  } else if (type === 'boolean') {
    decorators.push(
      optional ? '@IsOptional()\n  @IsBoolean()' : '@IsBoolean()',
    );
  } else if (type === 'Date') {
    decorators.push(
      optional
        ? '@IsOptional()\n  @IsDate()\n  @Type(() => Date)'
        : '@IsDate()\n  @Type(() => Date)',
    );
  }
  return decorators;
}

function getSwaggerDecorator(
  type: string,
  isFile = false,
  enumType?: string,
): string {
  if (isFile)
    return `@ApiProperty({ type: 'string', format: 'binary', required: false })`;

  if (enumType)
    return `@ApiProperty({ enum: ${enumType}, enumName: '${enumType}' })`;

  return `@ApiProperty()`;
}

const createDtoFields: string[] = [];
const filterDtoFields: string[] = [];

for (const prop of properties) {
  const originalName = prop.getName();
  if (excludeFields.includes(originalName)) continue;

  const rawType = prop.getType().getText();
  const type = cleanType(rawType);
  const isOptional = prop.hasQuestionToken();
  const isFile = originalName === 'picture' || originalName.endsWith('_url');
  const relationType = getRelationType(prop);
  const isRelation =
    relationType === 'ManyToOne' || relationType === 'OneToOne';

  if (relationType === 'OneToMany' || relationType === 'ManyToMany') continue;

  let name = originalName;
  let tsType = type;

  if (isRelation) {
    name = `${originalName}Id`;
    tsType = 'number';
  } else if (isFile) {
    if (originalName.endsWith('_url')) {
      name = originalName.replace(/_url$/, '');
    }
    tsType = 'Multer.File';
  }

  const decorators: string[] = [];

  if (isEnumTypeNode(prop)) {
    usedEnums.add(type);
    decorators.push(getSwaggerDecorator(type, false, type));
    decorators.push(`@IsEnum(${type})`);
    decorators.unshift(isOptional ? `@IsOptional()` : `@IsNotEmpty()`);
  } else if (originalName === 'description') {
    if (isOptional) decorators.unshift(`@IsOptional()`);
    decorators.push(`@IsNotBlank()`);
    decorators.push(`@IsString()`);
    decorators.push(getSwaggerDecorator(type));
  } else if (isFile) {
    decorators.push(getSwaggerDecorator(type, true));
    decorators.push(`@IsOptional()`);
  } else if (isRelation) {
    decorators.push(getSwaggerDecorator(type));
    if (isOptional) decorators.unshift(`@IsOptional()`);
    else decorators.unshift(`@IsNotEmpty()`);
    decorators.push(`@IsPositive()`);
    decorators.push(`@Type(() => Number)`);
  } else {
    decorators.push(getSwaggerDecorator(type));
    if (!isOptional) decorators.push(`@IsNotEmpty()`);
    decorators.push(...getDecorator(type, isOptional));
  }

  createDtoFields.push(
    `\n  ${decorators.join('\n  ')}\n  ${name}${isOptional ? '?' : ''}: ${tsType};`,
  );

  // Filter DTO
  if (!originalName.endsWith('_url')) {
    let filterType: string;
    let swaggerLine = `@ApiProperty({ required: false })`;

    if (isRelation) {
      filterType = 'number';
    } else if (isEnumTypeNode(prop)) {
      filterType = type;
      swaggerLine = `@ApiProperty({ enum: ${type}, enumName: '${type}', required: false })`;
    } else if (['string', 'number', 'boolean'].includes(type)) {
      filterType = type;
    } else {
      filterType = 'any';
    }

    filterDtoFields.push(`
  ${swaggerLine}
  @IsOptional()
  ${name}?: ${filterType};`);
  }
}

// Collect enum imports
for (const enumName of usedEnums) {
  const importDecl = importDeclarations.find((id) =>
    id.getNamedImports().some((ni) => ni.getName() === enumName),
  );
  if (importDecl) {
    usedEnumImports.set(enumName, importDecl.getText());
  }
}

function getImports() {
  return `import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsPositive,
  IsDate,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Multer } from 'multer';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { IsNotBlank } from '../../../common/validation/is-not-blank.validation';`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const enumImportString = [...usedEnumImports.values()].join('\n');

fs.mkdirSync(dtoDir, { recursive: true });

fs.writeFileSync(
  createDtoFile,
  `${getImports()}
${enumImportString}

export class Create${capitalize(className)}Dto {${createDtoFields.join('\n')}
}
`,
);

fs.writeFileSync(
  filterDtoFile,
  `${getImports()}
${enumImportString}

export class ${capitalize(className)}FilterDto extends PaginationDto {${filterDtoFields.join('\n')}
}
`,
);

console.log(`✅ DTOs generated in ${dtoDir}`);
