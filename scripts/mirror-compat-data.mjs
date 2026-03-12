import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const owner = process.env.COMPAT_SOURCE_OWNER || "xenios-jp";
const repo = process.env.COMPAT_SOURCE_REPO || "game-compatibility";
const branch = process.env.COMPAT_SOURCE_BRANCH || "main";

const files = [
  ["data/discussions.json", "data/discussions.json"],
];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "xenios-website-compat-mirror" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${await response.text()}`);
  }
  return response.text();
}

async function writeFile(relativePath, content) {
  const destination = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, "utf8");
}

async function main() {
  for (const [sourcePath, targetPath] of files) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${sourcePath}`;
    const content = await fetchText(url);
    await writeFile(targetPath, content);
    console.log(`Mirrored ${url} -> ${targetPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
