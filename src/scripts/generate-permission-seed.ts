import * as fs from 'node:fs';
import * as path from 'node:path';

// Define the output file for the seeder
const OUTPUT_FILE = 'src/seeds/permissions.seeder.ts';
const MODULES_DIR = 'src/modules';
const DEFAULT_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE']; // Corresponds to your PermissionAction enum

function generatePermissionsSeederFile() {
  let seederContent = `import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Permission } from '../modules/permissions/entities/permission.entity';
import { PermissionAction } from '../common/enums/permission.enum'; // Ensure this path is correct based on your project structure

@Injectable()
export class PermissionsSeeder {
  constructor(private readonly repo: Repository<Permission>) {}

  async truncate(cascade = false) {
    const query = \`TRUNCATE TABLE "permissions" \${cascade ? ' CASCADE' : ''}\`;
    await this.repo.query(query);
  }

  async resetSequence(startAt = 1) {
    await this.repo.query(\`
      SELECT setval(
        pg_get_serial_sequence('permissions', 'id'),
        \${startAt},
        false
      )
    \`);
  }

  async run() {
    // await this.truncate(true); // Truncate existing permissions, cascade if necessary
    // await this.resetSequence(1); // Reset ID sequence for a clean start

    const permissionsData = [
`;

  if (!fs.existsSync(MODULES_DIR)) {
    console.error(`Lỗi: Thư mục '${MODULES_DIR}' không tìm thấy.`);
    console.error(`Hãy đảm bảo bạn chạy script này ở thư mục gốc của project.`);
    process.exit(1);
  }

  console.log(
    `Tìm kiếm các modules trong thư mục '${MODULES_DIR}' để tạo seeder...`,
  );

  const moduleDirectories = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const moduleName of moduleDirectories) {
    // Skip hidden directories or directories ending with '-translations'
    if (moduleName.startsWith('.') || moduleName.endsWith('-translations')) {
      console.log(`Bỏ qua module '${moduleName}' (translations hoặc ẩn).`);
      continue;
    }

    seederContent += `      // Quyền cho module: ${moduleName}\n`;
    for (const action of DEFAULT_ACTIONS) {
      seederContent += `      { resource: '${moduleName}', action: PermissionAction.${action} },\n`;
    }
    seederContent += '\n'; // Add a blank line between modules for readability
  }

  seederContent += `    ];

    const permissions = this.repo.create(permissionsData);
    await this.repo.save(permissions);
  }
}
`;

  // Ensure the directory for the output file exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    fs.writeFileSync(OUTPUT_FILE, seederContent);
    console.log(`Đã tạo thành công file seeder '${OUTPUT_FILE}'.`);
    console.log(`Kiểm tra và điều chỉnh file '${OUTPUT_FILE}' nếu cần thiết.`);
  } catch (error) {
    console.error(`Lỗi khi ghi file seeder '${OUTPUT_FILE}':`, error);
    process.exit(1);
  }
}

// Execute the function to generate the seeder file
generatePermissionsSeederFile();
