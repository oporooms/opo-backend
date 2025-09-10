import path from 'path';

/**
 * Resolves a path that starts with '@/'.
 * Example: '@/controllers/mainController' => '<project_root>/src/controllers/mainController'
 * @param inputPath The path string to resolve
 * @returns The absolute path
 */
export function resolveSrcPath(inputPath: string): string {
  if (inputPath.startsWith('@/')) {
    const srcDir = path.resolve(__dirname, '../');
    return path.join(srcDir, inputPath.replace(/^@\//, ''));
  }
  return inputPath;
}