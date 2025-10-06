#!/usr/bin/env node

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const name = args[0];
const hasUpload = args.includes('--hasUpload');

if (!name) {
  console.error('❌ Vui lòng nhập tên entity. Ví dụ: generate apartments');
  process.exit(1);
}

const options = hasUpload ? ` ${name} --hasUpload` : ` ${name}`;

const commands = [
  `yarn generate-dto${options}`,
  `yarn generate-module${options}`,
  `yarn generate-controller${options}`,
  `yarn generate-service${options}`,
];

commands.forEach((cmd) => {
  console.log(`👉 Chạy: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Lỗi khi chạy: ${cmd}`);
    process.exit(1);
  }
});
