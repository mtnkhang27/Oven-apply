// scripts/list-modules.ts
import * as fs from 'fs';
import * as path from 'path';

const modulesDir = path.resolve(__dirname, '../../src/modules');

function listModuleNames() {
  const items = fs.readdirSync(modulesDir, { withFileTypes: true });
  const folders = items
    .filter((item) => item.isDirectory())
    .map((dir) => dir.name);

  console.log('Modules found:', folders);
  return folders;
}

listModuleNames();
