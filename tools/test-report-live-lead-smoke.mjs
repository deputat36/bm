import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const TITLE = "[Автомониторинг] Сбой обработчика заявок";
const REPORT_PATH = fileURLToPath(new URL("./report-live-lead-smoke.mjs", import.meta.url));
const state = {
  issue: null,
  comments: [],
  createCount: 0,
  updateCount: 0,
  requests: []
};

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  state.requests.push({ method: request.method, path: url.pathname, authorization: request.headers.authorization || "" });

  if (request.headers.authorization !== "Bearer test-token") {
    json(response, 401, { message: "bad token" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/repos/test/repo/issues") {
    json(response, 200, state.issue ? [state.issue] : []);
    return;
  }

  if (request.method === "POST" && url.pathname === "/repos/test/repo/issues") {
    const body = await readJson(request);
    state.createCount += 1;
    state.issue = {
      number: 1,
      title: body.title,
      body: body.body,
      state: "open"
    };
    json(response, 201, state.issue);
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/repos/test/repo/issues/1") {
    const body = await readJson(request);
    state.updateCount += 1;
    state.issue = { ...state.issue, ...body };
    json(response, 200, state.issue);
    return;
  }

  if (request.method === "POST" && url.pathname === "/repos/test/repo/issues/1/comments") {
    const body = await readJson(request);
    state.comments.push(body);
    json(response, 201, { id: state.comments.length, ...body });
    return;
  }

  json(response, 404, { message: `${request.method} ${url.pathname} not found` });
});

function runReporter(apiUrl, status, runId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [REPORT_PATH], {
      env: {
        ...process.env,
        GITHUB_API_URL: apiUrl,
        GITHUB_TOKEN: "test-token",
        GITHUB_REPOSITORY: "test/repo",
        GITHUB_RUN_ID: String(runId),
        GITHUB_SERVER_URL: "https://github.example",
        GITHUB_EVENT_NAME: "schedule",
        GITHUB_REF_NAME: "main",
        MONITOR_STATUS: status
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Reporter exited ${code}: ${stderr || stdout}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address === "object");
const apiUrl = `http://127.0.0.1:${address.port}`;

try {
  const createdOutput = await runReporter(apiUrl, "failure", 100);
  assert.match(createdOutput, /Created monitoring issue #1/);
  assert.equal(state.createCount, 1);
  assert.equal(state.issue?.title, TITLE);
  assert.equal(state.issue?.state, "open");
  assert.match(state.issue?.body || "", /actions\/runs\/100/);

  const updatedOutput = await runReporter(apiUrl, "failure", 101);
  assert.match(updatedOutput, /Updated monitoring issue #1/);
  assert.equal(state.createCount, 1, "Repeated failure must not create a duplicate issue");
  assert.equal(state.updateCount, 1);
  assert.equal(state.issue?.state, "open");
  assert.match(state.issue?.body || "", /actions\/runs\/101/);
  assert.doesNotMatch(state.issue?.body || "", /actions\/runs\/100/);

  const recoveredOutput = await runReporter(apiUrl, "success", 102);
  assert.match(recoveredOutput, /Closed recovered monitoring issue #1/);
  assert.equal(state.issue?.state, "closed");
  assert.equal(state.issue?.state_reason, "completed");
  assert.equal(state.comments.length, 1);
  assert.match(state.comments[0].body, /actions\/runs\/102/);
  assert.match(state.comments[0].body, /закрыта автоматически/);

  assert(state.requests.length >= 7);
  assert(state.requests.every((request) => request.authorization === "Bearer test-token"));

  console.log("Monitoring issue lifecycle passed: create, update without duplicate, close after recovery.");
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
