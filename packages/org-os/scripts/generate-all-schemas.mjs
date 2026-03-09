import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const candidates = [
  process.env.COOP_ORG_OS_SCHEMAS,
  resolve(__dirname, "../../../../organizational-os/packages/framework/schemas"),
  resolve(__dirname, "../../../organizational-os/packages/framework/schemas"),
].filter(Boolean);

const files = ["skills.json-ld", "meetings.json-ld", "projects.json-ld", "finances.json-ld"];

async function findSourceBase() {
  for (const candidate of candidates) {
    try {
      await access(join(candidate, files[0]));
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Could not find Org-OS schema source. Checked:\n${candidates
      .map((p) => `- ${p}`)
      .join("\n")}\n\nSet COOP_ORG_OS_SCHEMAS to the framework schemas directory.`,
  );
}

const sourceBase = await findSourceBase();
const targetBase = resolve(__dirname, "../schemas");

await mkdir(targetBase, { recursive: true });
for (const file of files) {
  const source = join(sourceBase, file);
  const target = join(targetBase, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log(`Synced ${files.length} schemas from ${sourceBase} into ${targetBase}`);
