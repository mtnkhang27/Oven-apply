import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import {
  Project,
  StructureKind,
  DecoratorStructure,
  SyntaxKind,
} from 'ts-morph';
import { fixEslint, toPascalCase } from './functions';

const modulesDir = path.join(__dirname, '../modules');
const tsConfigPath = path.join(__dirname, '../../tsconfig.json');

const project = new Project({ tsConfigFilePath: tsConfigPath });

function parseDecorator(decoratorText: string): DecoratorStructure {
  const decoratorNameMatch = decoratorText.match(/^@(\w+)/);
  if (!decoratorNameMatch) {
    throw new Error(`Invalid decorator format: ${decoratorText}`);
  }
  const name = decoratorNameMatch[1];
  const argsMatch = decoratorText.match(/\((.*)\)/);
  let args: string[] = [];
  if (argsMatch && argsMatch[1].trim().length > 0) {
    args = [argsMatch[1].trim()];
  }

  return {
    kind: StructureKind.Decorator,
    name,
    arguments: args,
  };
}

function getDateProperties(filePath: string): string[] {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const classDecl = sourceFile.getClasses()[0];
  const dateProps: string[] = [];

  if (!classDecl) return dateProps;

  classDecl.getProperties().forEach((prop) => {
    const type = prop.getType().getText();
    if (type === 'Date') {
      dateProps.push(prop.getName());
    }
  });

  return dateProps;
}

function insertDateFilters(
  filterPath: string,
  dateProps: string[],
  className: string,
) {
  const sourceFile = project.addSourceFileAtPath(filterPath);
  const classDecl = sourceFile.getClass((c) => {
    const name = c.getName();
    return name ? name.endsWith('FilterDto') : false;
  });
  if (!classDecl) return;

  // --- Thêm import IsValidDate, IsValidDateRange ---
  const importDeclarations = sourceFile.getImportDeclarations();

  const importValidatorNames = ['IsValidDate', 'IsValidDateRange'];
  importValidatorNames.forEach((importName) => {
    const exists = importDeclarations.some((imp) =>
      imp.getNamedImports().some((ni) => ni.getName() === importName),
    );
    if (!exists) {
      sourceFile.addImportDeclaration({
        namedImports: [importName],
        moduleSpecifier: `../../../common/validation/${importName === 'IsValidDate' ? 'is-date.validation' : 'is-valid-date-range'}`,
      });
    }
  });

  // --- Thêm IsDateString vào import class-validator nếu chưa có ---
  const classValidatorImport = importDeclarations.find(
    (imp) => imp.getModuleSpecifierValue() === 'class-validator',
  );

  if (classValidatorImport) {
    const namedImports = classValidatorImport
      .getNamedImports()
      .map((ni) => ni.getName());
    if (!namedImports.includes('IsDateString')) {
      classValidatorImport.addNamedImport('IsDateString');
    }
  } else {
    sourceFile.addImportDeclaration({
      namedImports: ['IsDateString'],
      moduleSpecifier: 'class-validator',
    });
  }

  // --- Thêm @IsValidDateRange decorators lên class nếu chưa có ---
  const existingDecorators = classDecl.getDecorators().map((d) => d.getText());
  dateProps.forEach((prop) => {
    const fromName = `${prop}From`;
    const toName = `${prop}To`;
    const decoratorText = `@IsValidDateRange('${fromName}', '${toName}', { message: '${fromName} must be before or equal to ${toName}' })`;

    if (!existingDecorators.includes(decoratorText)) {
      classDecl.addDecorator({
        kind: StructureKind.Decorator,
        name: 'IsValidDateRange',
        arguments: [
          `'${fromName}'`,
          `'${toName}'`,
          `{ message: '${fromName} must be before or equal to ${toName}' }`,
        ],
      });
    }
  });

  // --- Tạo decorators cho từng property ---
  function createDecorators(propertyName: string): DecoratorStructure[] {
    return [
      {
        kind: StructureKind.Decorator,
        name: 'ApiPropertyOptional',
        arguments: [`{ type: String, format: 'date-time' }`],
      },
      {
        kind: StructureKind.Decorator,
        name: 'IsOptional',
        arguments: [],
      },
      {
        kind: StructureKind.Decorator,
        name: 'IsDateString',
        arguments: [],
      },
      {
        kind: StructureKind.Decorator,
        name: 'IsValidDate',
        arguments: [`{ message: '${propertyName} is not a valid real date' }`],
      },
    ];
  }

  for (const prop of dateProps) {
    const fromName = `${prop}From`;
    const toName = `${prop}To`;

    if (!classDecl.getProperty(fromName)) {
      classDecl.addProperty({
        name: fromName,
        type: 'string',
        hasQuestionToken: true,
        decorators: createDecorators(fromName),
      });
    }
    if (!classDecl.getProperty(toName)) {
      classDecl.addProperty({
        name: toName,
        type: 'string',
        hasQuestionToken: true,
        decorators: createDecorators(toName),
      });
    }
  }

  // Thêm dòng trắng giữa các property bằng cách chỉnh sửa từng property text
  const props = classDecl.getProperties();
  props.forEach((prop, index) => {
    if (index < props.length - 1) {
      const current = prop.getStructure();
      prop.replaceWithText((writer) => {
        writer.write(prop.getText()).write('\n\n'); // thêm 2 dòng trắng sau mỗi prop
      });
    }
  });

  project.saveSync();
  fixEslint(filterPath);
  console.log(`✅ Updated: ${filterPath}`);
}

fs.readdirSync(modulesDir).forEach((moduleName) => {
  const modulePath = path.join(modulesDir, moduleName);
  const singular = pluralize.singular(moduleName);
  const entityPath = path.join(modulePath, 'entities', `${singular}.entity.ts`);
  const dtoPath = path.join(modulePath, 'dto', `${singular}-filter.dto.ts`);

  if (!fs.existsSync(entityPath) || !fs.existsSync(dtoPath)) return;

  const className = toPascalCase(singular);
  const dateFields = getDateProperties(entityPath);

  if (dateFields.length) {
    insertDateFilters(dtoPath, dateFields, className);
  }
});
