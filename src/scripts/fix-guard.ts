import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { fixEslint, toPascalCase } from './functions';

const targetModule = process.argv[2]; // optional, nếu không truyền sẽ xử lý tất cả
const modulesRoot = path.join(__dirname, '../modules');

// Hàm thêm decorator vào controller
function processController(controllerPath: string) {
  let content = fs.readFileSync(controllerPath, 'utf-8');

  // Lấy tên module từ file path
  const moduleDir = path.basename(path.dirname(controllerPath));
  const className = toPascalCase(moduleDir);

  // Regex tìm hàm async createXxx
  const regex = /(\n\s*)async\s+create\w*\s*\(/g;

  content = content.replace(regex, (match, indent) => {
    // Check nếu ngay phía trên đã có @AuthorizeResource
    const before = content.slice(0, content.indexOf(match));
    const lastLines = before.split('\n').slice(-3).join('\n');
    if (/@AuthorizeResource\(/.test(lastLines)) {
      return match; // skip nếu đã có decorator
    }

    const decorator = `${indent}@AuthorizeResource(PermissionAction.CREATE, '${moduleDir}')\n${indent}async create(`;
    return decorator;
  });

  fs.writeFileSync(controllerPath, content, 'utf-8');
  fixEslint(controllerPath);
  console.log(`✅ Updated: ${controllerPath}`);
}

// Hàm kiểm tra xem có cần bỏ qua module không
function shouldSkipModule(filePath: string): boolean {
  const dirName = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath, '.controller.ts');

  return (
    /-auth$/.test(dirName) ||
    /details$/.test(dirName) ||
    /translations$/.test(dirName) ||
    dirName === 'languages' ||
    /-auth$/.test(fileName) ||
    /details$/.test(fileName) ||
    /translations$/.test(fileName)
  );
}

// Nếu chỉ xử lý 1 module cụ thể
if (targetModule) {
  if (
    /-auth$/.test(targetModule) ||
    /details$/.test(targetModule) ||
    /translations$/.test(targetModule) ||
    targetModule === 'languages'
  ) {
    console.log(`⏩ Skipped module: ${targetModule}`);
    process.exit(0);
  }

  const controllerPath = path.join(
    modulesRoot,
    targetModule,
    `${targetModule}.controller.ts`,
  );
  if (fs.existsSync(controllerPath)) {
    processController(controllerPath);
  } else {
    console.error(`❌ Controller not found: ${controllerPath}`);
  }
} else {
  // Xử lý tất cả modules
  const pattern = path.join(modulesRoot, '**/*.controller.ts');
  const files = glob.sync(pattern).filter(filePath => !shouldSkipModule(filePath));

  files.forEach(processController);
}
