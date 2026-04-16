import type { APIRequestContext } from "@playwright/test";

const TEST_STATE_URL = "http://127.0.0.1:8000/api/test/state";

export type BackendTestState = Record<string, unknown>;

async function assertOk(response: ResponseLike, context: string) {
  if (!response.ok()) {
    throw new Error(`${context} failed with status ${response.status()}`);
  }
}

type ResponseLike = {
  ok(): boolean;
  status(): number;
  json(): Promise<unknown>;
};

export async function captureBackendState(
  request: APIRequestContext,
): Promise<BackendTestState> {
  const response = await request.get(TEST_STATE_URL);
  await assertOk(response, "capture backend state");
  const payload = (await response.json()) as {
    data: BackendTestState;
    success: boolean;
  };
  return payload.data;
}

export async function restoreBackendState(
  request: APIRequestContext,
  state: BackendTestState,
): Promise<void> {
  const response = await request.post(TEST_STATE_URL, {
    data: { data: state },
  });
  await assertOk(response, "restore backend state");
}
