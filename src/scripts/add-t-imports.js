const { readdirSync, readFileSync, writeFileSync, statSync } = require('fs');
const { join, dirname } = require('path');

function walk(dir, filelist = []) {
  readdirSync(dir).forEach(file => {
    const filepath = join(dir, file);
    if (statSync(filepath).isDirectory()) {
      filelist = walk(filepath, filelist);
    } else if (filepath.endsWith('.service.ts')) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

const files = walk('../'); // vì bạn đang ở src/scripts nên ../ là src


files.forEach(file => {
  let content = readFileSync(file, 'utf8');

  // kiểm tra có dùng t(' mà chưa import
  if (content.includes("t(") && !content.match(/import\s+\{\s*t\s*\}\s+from/)) {
    // Tính path tới i18n dựa trên số cấp thư mục
    const depth = dirname(file).split('/').length - 1;
    // ví dụ: ../../i18n
    const importPath = '../'.repeat(depth - 1) + 'i18n';

    // Thêm import lên đầu file (sau các import hiện tại)
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('import')) {
        insertIndex = i;
        break;
      }
    }
    lines.splice(insertIndex, 0, `import { t } from '${importPath}';`);
    content = lines.join('\n');

    writeFileSync(file, content, 'utf8');
    console.log(`Added import t to ${file}`);
  }
});
