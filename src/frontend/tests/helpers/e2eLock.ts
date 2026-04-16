import { mkdir, rm } from "node:fs/promises";

const LOCK_DIR = "/tmp/dividend-portfolio-playwright-lock";
const RETRY_DELAY_MS = 200;
const MAX_RETRIES = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function acquireE2ELock(): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      await mkdir(LOCK_DIR);
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") {
        throw err;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error("E2E backend state lock acquisition timed out");
}

export async function releaseE2ELock(): Promise<void> {
  try {
    await rm(LOCK_DIR, { recursive: true, force: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}
