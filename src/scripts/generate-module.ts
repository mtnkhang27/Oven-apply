import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import * as pluralize from 'pluralize';
import { fixEslint, toPascalCase } from './functions';

const moduleName = process.argv[2];
const singular = pluralize.singular(moduleName);
const className = toPascalCase(singular);
const classNamePlural = pluralize.plural(className); // e.g. "Advertisement" → "Advertisements"

const entityPath = path.join(__dirname, `../modules/${moduleName}/entities/${singular}.entity.ts`);
const moduleFilePath = path.join(__dirname, `../modules/${moduleName}/${moduleName}.module.ts`);

const project = new Project();
const entityFile = project.addSourceFileAtPath(entityPath);
const entityClass = entityFile.getClasses()[0];
const properties = entityClass.getProperties();

const manyToOneEntities = new Set<string>();

for (const prop of properties) {
  const decorators = prop.getDecorators();
  for (const dec of decorators) {
    if (dec.getName() === 'ManyToOne') {
      const argText = dec.getArguments()[0].getText(); // () => EntityName
      const match = argText.match(/=>\s*(\w+)/);
      if (match) {
        manyToOneEntities.add(match[1]);
      }
    }
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toKebabCasePlural(entity: string): string {
  const plural = pluralize.plural(entity);
  return plural.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function toEntityPath(entity: string): string {
  const folder = toKebabCasePlural(entity);
  const filename = entity.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `../${folder}/entities/${filename}.entity`;
}

function toServicePath(entity: string): string {
  const folder = toKebabCasePlural(entity);
  return `../${folder}/${folder}.service`;
}

function toControllerPath(moduleName: string): string {
  const folder = toKebabCasePlural(moduleName);
  return `./${folder}.controller`;
}

const importEntities = Array.from(manyToOneEntities);

// Entity imports
const entityImports = importEntities
  .map((e) => `import { ${e} } from '${toEntityPath(e)}';`)
  .join('\n');

// Service imports (pluralized and capitalized)
const serviceImports = importEntities
  .map((e) => {
    const plural = pluralize.plural(e);
    const capitalizedPlural = capitalize(plural);
    return `import { ${capitalizedPlural}Service } from '${toServicePath(e)}';`;
  })
  .join('\n');

// Controller import
const controllerImport = `import { ${classNamePlural}Controller } from '${toControllerPath(moduleName)}';`;

// Main service import
const mainServiceImport = `import { ${classNamePlural}Service } from './${moduleName}.service';`;

// Combine all service names
const relatedServiceNames = importEntities.map(e => `${capitalize(pluralize.plural(e))}Service`);
const serviceNames = [`${classNamePlural}Service`, ...relatedServiceNames].join(', ');

// Entity list
const entityNames = [className, ...importEntities];

const output = `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ${className} } from './entities/${singular}.entity';
${entityImports}
${mainServiceImport}
${controllerImport}
${serviceImports}

@Module({
  imports: [TypeOrmModule.forFeature([${entityNames.join(', ')}])],
  controllers: [${classNamePlural}Controller],
  providers: [${serviceNames}],
  exports: [${classNamePlural}Service],
})
export class ${classNamePlural}Module {}
`;

fs.writeFileSync(moduleFilePath, output.trim());
console.log(`✅ Module generated at ${moduleFilePath}`);

fixEslint(moduleFilePath);
