const fs = require("node:fs/promises");
const path = require("node:path");
const logger = require("./logger");

module.exports = async function loadFiles(dirName) {
  const root = path.resolve(process.cwd(), dirName);

  const IGNORE = new Set(["node_modules"]);

  try {
    try {
      await fs.access(root);
    } catch {
      await fs.mkdir(root, { recursive: true });
    }

    const stats = await fs.stat(root);
    if (!stats.isDirectory()) {
      throw new Error(`Expected a directory: ${root}`);
    }

    const files = [];
    let queue = [root];

    while (queue.length) {
      const batch = queue;
      queue = [];

      const directories = await Promise.all(
        batch.map(async (dir) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          return { dir, entries };
        }),
      );

      for (const { dir, entries } of directories) {
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!IGNORE.has(entry.name)) queue.push(fullPath);
            continue;
          }

          if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(fullPath);
          }
        }
      }
    }

    return files;
  } catch (error) {
    logger.error(`Failed to load files from ${root}: ${error.message}`, error);
    throw error;
  }
};
