import test from "node:test";
import assert from "node:assert/strict";
import { readJsonResponse, ApiResponseError } from "../src/utils/apiResponse.js";

test("readJsonResponse rejects HTML API fallbacks", async () => {
  const response = new Response("<!doctype html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
  await assert.rejects(() => readJsonResponse(response, "Bootstrap"), (error: unknown) => {
    return error instanceof ApiResponseError && error.code === "NON_JSON";
  });
});

test("readJsonResponse classifies expired sessions", async () => {
  const response = new Response(JSON.stringify({ error: "Invalid session" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(() => readJsonResponse(response), (error: unknown) => {
    return error instanceof ApiResponseError && error.code === "AUTH";
  });
});
