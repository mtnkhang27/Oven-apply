import { Project } from 'ts-morph';
import * as pluralize from 'pluralize';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const controllerFiles = project.getSourceFiles(
  'src/modules/**/*.controller.ts',
);

controllerFiles.forEach((file) => {
  const filePath = file.getFilePath();
  const fileName = filePath.split('/').pop() || '';

  // Bỏ qua file kết thúc bằng -auth hoặc -language trước khi xử lý
  if (
    fileName.endsWith('-auth.controller.ts') ||
    fileName.endsWith('languages.controller.ts') ||
    fileName.endsWith('-details.controller.ts') ||
    fileName.endsWith('-translations.controller.ts')
  ) {
    return; // Skip file
  }

  let modified = false;

  file.getClasses().forEach((cls) => {
    const controllerDecorator = cls.getDecorator('Controller');
    if (!controllerDecorator) return;

    const [controllerPathArg] = controllerDecorator.getArguments();
    const controllerPath =
      controllerPathArg && controllerPathArg.getText().replace(/['"`]/g, '');

    //Maybe do something with resourceName
    const resourceName = controllerPath;

    // ✅ Add @ApiBearerAuth and @Auth
    const decoratorNames = cls.getDecorators().map((d) => d.getName());

    if (!decoratorNames.includes('ApiBearerAuth')) {
      cls.addDecorator({ name: 'ApiBearerAuth', arguments: [] });
      modified = true;
    }

    if (!decoratorNames.includes('Auth')) {
      cls.addDecorator({ name: 'Auth', arguments: [] });
      modified = true;
    }

    cls.getMethods().forEach((method) => {
      const methodName = method.getName();
      const decorators = method.getDecorators().map((d) => d.getName());

      const actionMap: Record<string, string> = {
        findAll: 'READ',
        findOne: 'READ',
        create: 'CREATE',
        update: 'UPDATE',
        remove: 'DELETE',
      };

      const action = actionMap[methodName];

      if (action && !decorators.includes('AuthorizeResource')) {
        method.addDecorator({
          name: 'AuthorizeResource',
          arguments: [`PermissionAction.${action}`, `'${resourceName}'`],
        });
        modified = true;
      }

      if (
        ['create', 'update'].includes(methodName) &&
        !decorators.includes('UseInterceptors')
      ) {
        method.addDecorator({
          name: 'UseInterceptors',
          arguments: ['ActorInterceptor'],
        });
        modified = true;
      }
    });
  });

  // Ensure imports
  const ensureImport = (name: string, path: string) => {
    const existingImport = file.getImportDeclaration(
      (dec) => dec.getModuleSpecifierValue() === path,
    );

    if (existingImport) {
      const names = existingImport.getNamedImports().map((n) => n.getName());
      if (!names.includes(name)) {
        existingImport.addNamedImport(name);
        modified = true;
      }
    } else {
      file.addImportDeclaration({
        namedImports: [name],
        moduleSpecifier: path,
      });
      modified = true;
    }
  };

  if (modified) {
    ensureImport(
      'AuthorizeResource',
      '../../common/decorators/authorize-resource.decorator',
    );
    ensureImport('Resource', '../../common/decorators/resource.decorator');
    ensureImport('PermissionAction', '../../common/enums/permission.enum');
    ensureImport(
      'ActorInterceptor',
      '../../common/interceptors/actor.interceptor',
    );
    ensureImport('Auth', '../users-auth/users-auth.decorator');
    ensureImport('ApiBearerAuth', '@nestjs/swagger');

    const commonImport = file.getImportDeclaration(
      (dec) => dec.getModuleSpecifierValue() === '@nestjs/common',
    );
    if (commonImport) {
      const names = commonImport.getNamedImports().map((n) => n.getName());
      if (!names.includes('UseInterceptors')) {
        commonImport.addNamedImport('UseInterceptors');
        modified = true;
      }
    } else {
      file.addImportDeclaration({
        namedImports: ['UseInterceptors'],
        moduleSpecifier: '@nestjs/common',
      });
      modified = true;
    }

    file.saveSync();
    console.log(`✅ Updated: ${filePath}`);
  }
});
