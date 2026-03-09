import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const templatesPath = join(root, "templates");
const outPath = join(root, "workspace-seed");

await mkdir(outPath, { recursive: true });
const onboarding = `# Coop Onboarding

- Organization name:
- Primary coordination needs:
- Preferred pillars: impact-reporting, coordination, governance, capital-formation
- Initial coop members:
`;

await writeFile(join(outPath, "ONBOARDING.md"), onboarding, "utf8");
await writeFile(
  join(outPath, "README.md"),
  "Generated workspace seed from org-os scripts.\n",
  "utf8",
);
console.log(`Workspace seed generated from ${templatesPath} into ${outPath}`);
