import { exec } from "child_process";

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/g)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str.replace(/-/g, '_');
}

export function fixEslint(path: string) {
  exec(`npx eslint --fix ${path}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ESLint fix error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`❌ ESLint fix stderr: ${stderr}`);
    }
    console.log(`✅ ESLint auto-fixed file at ${path}`);
  });
}
