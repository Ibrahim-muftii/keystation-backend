import fs from "fs";
import path from "path";


export async function flattenAudioFiles(sourceDir: string,targetDir: string): Promise<string[]> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const collectedFiles: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (/\.(mp3|wav|m4a)$/i.test(entry)) {
        // Avoid filename collisions
        const newFileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}-${entry}`;
        const destination = path.join(targetDir, newFileName);
        fs.copyFileSync(fullPath, destination);
        collectedFiles.push(destination);
      }
    }
  }

  walk(sourceDir);
  return collectedFiles;
}
