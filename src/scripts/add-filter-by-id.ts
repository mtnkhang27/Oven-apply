import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { fixEslint } from './functions';

const modulesRoot = path.join(__dirname, '../modules');
const pattern = path.join(modulesRoot, '**/dto/*-filter.dto.ts');

// đoạn code sẽ chèn
const idBlock = `  @ApiPropertyOptional()
  @IsOptional()
  id?: string;
`;

function processFilterDto(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // skip nếu đã có id
  if (/\bid\?\s*:\s*string\s*;/.test(content)) {
    console.log(`⏩ Skipped (already has id): ${filePath}`);
    return;
  }

  // tìm vị trí chèn: ngay sau dấu {
  const classRegex = /(export\s+class\s+\w+\s+extends\s+PaginationDto\s*{\s*\n)/;
  if (classRegex.test(content)) {
    content = content.replace(classRegex, `$1${idBlock}`);
    fs.writeFileSync(filePath, content, 'utf-8');
    fixEslint(filePath);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.warn(`⚠️ Không tìm thấy class extends PaginationDto: ${filePath}`);
  }
}

const files = glob.sync(pattern);
files.forEach(processFilterDto);
