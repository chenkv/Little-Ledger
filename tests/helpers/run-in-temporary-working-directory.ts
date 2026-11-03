import { mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function runInTemporaryWorkingDirectory<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const originalWorkingDirectory = process.cwd();
  const temporaryWorkingDirectory = await mkdtemp(
    join(tmpdir(), "little-ledger-parser-"),
  );
  const debugFilePath = join(
    temporaryWorkingDirectory,
    "little-ledger-extracted-text.txt",
  );

  try {
    process.chdir(temporaryWorkingDirectory);
    return await callback();
  } finally {
    process.chdir(originalWorkingDirectory);
    await rm(debugFilePath, { force: true });
    await rmdir(temporaryWorkingDirectory);
  }
}
