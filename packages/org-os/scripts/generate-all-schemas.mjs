import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const sourceBase = '/Users/luizfernando/Desktop/Workspaces/Zettelkasten/03 Libraries/organizational-os-framework/schemas';
const targetBase = new URL('../schemas', import.meta.url).pathname;
const files = ['skills.json-ld', 'meetings.json-ld', 'projects.json-ld', 'finances.json-ld'];

await mkdir(targetBase, { recursive: true });
for (const file of files) {
  const source = join(sourceBase, file);
  const target = join(targetBase, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log(`Synced ${files.length} schemas into ${targetBase}`);
