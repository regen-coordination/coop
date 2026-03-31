import path from 'node:path';

export const extensionBuildDirSegments = ['packages', 'extension', 'dist', 'chrome-mv3'] as const;
export const extensionArchivesDirSegments = ['packages', 'extension', 'dist', 'archives'] as const;

export function resolveExtensionBuildDir(rootDir: string) {
  return path.join(rootDir, ...extensionBuildDirSegments);
}

export function resolveExtensionArchivesDir(rootDir: string) {
  return path.join(rootDir, ...extensionArchivesDirSegments);
}

export function resolveExtensionArchivePath(rootDir: string, filename: string) {
  return path.join(resolveExtensionArchivesDir(rootDir), path.basename(filename));
}
