import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const sourceToTarget = [
  ["data/compatibility.json", "public/compatibility/data.json"],
  ["data/discussions.json", "public/compatibility/discussions.json"],
];

async function syncFile(sourceRelativePath, targetRelativePath) {
  const source = path.join(repoRoot, sourceRelativePath);
  const target = path.join(repoRoot, targetRelativePath);

  await fs.mkdir(path.dirname(target), { recursive: true });
  const content = await fs.readFile(source, "utf8");
  await fs.writeFile(target, content, "utf8");
}

async function main() {
  for (const [source, target] of sourceToTarget) {
    await syncFile(source, target);
    console.log(`Synced ${source} -> ${target}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
