import * as fs from 'fs';
import * as path from 'path';

export function deleteFile(filePath: string) {
  if (!filePath) return; // No file to delete
  const staticDir = process.env.STATIC_SERVE_DIR || '';
  if (staticDir == '') {
    console.log('staticDir null');
    return;
  } 
  const fullPath = path.join(__dirname, staticDir, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath); // Delete the file
  }
}
