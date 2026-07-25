const TITLE = "[Автомониторинг] Сбой обработчика заявок";
const token = process.env.GITHUB_TOKEN || "";
const repository = process.env.GITHUB_REPOSITORY || "";
const runId = process.env.GITHUB_RUN_ID || "";
const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
const apiUrl = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
const status = process.env.MONITOR_STATUS || "failure";
const eventName = process.env.GITHUB_EVENT_NAME || "unknown";
const refName = process.env.GITHUB_REF_NAME || "unknown";

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

requireValue(token, "GITHUB_TOKEN");
requireValue(repository, "GITHUB_REPOSITORY");
requireValue(runId, "GITHUB_RUN_ID");

const apiBase = `${apiUrl}/repos/${repository}`;
const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

async function github(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "newbuild-live-lead-monitor",
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${text || "invalid response"}`);
    throw new Error(`GitHub API returned invalid JSON: ${text.slice(0, 240)}`);
  }
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${body?.message || text || "unknown error"}`);
  }
  return body;
}

async function findMonitorIssue() {
  const issues = await github("/issues?state=all&per_page=100&sort=updated&direction=desc");
  return issues.find((issue) => !issue.pull_request && issue.title === TITLE) || null;
}

function failureBody() {
  return [
    "Автоматическая проверка боевого обработчика заявок завершилась ошибкой.",
    "",
    `Последний неуспешный запуск: [открыть проверку](${runUrl})`,
    `Событие: \`${eventName}\``,
    `Ветка или ref: \`${refName}\``,
    `Зафиксировано: ${new Date().toISOString()}`,
    "",
    "Проверка использует только health, CORS и заведомо отклоняемые запросы. Реальная заявка и персональные данные не создаются.",
    "",
    "Задача будет автоматически закрыта после успешного восстановления проверки."
  ].join("\n");
}

async function reportFailure(issue) {
  const body = failureBody();

  if (!issue) {
    const created = await github("/issues", {
      method: "POST",
      body: JSON.stringify({ title: TITLE, body })
    });
    console.log(`Created monitoring issue #${created.number}`);
    return;
  }

  await github(`/issues/${issue.number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "open", body })
  });
  console.log(`Updated monitoring issue #${issue.number}`);
}

async function reportRecovery(issue) {
  if (!issue || issue.state !== "open") {
    console.log("No open monitoring issue to close.");
    return;
  }

  await github(`/issues/${issue.number}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `Проверка восстановлена: [успешный запуск](${runUrl}). Задача закрыта автоматически.`
    })
  });

  await github(`/issues/${issue.number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" })
  });
  console.log(`Closed recovered monitoring issue #${issue.number}`);
}

async function main() {
  const issue = await findMonitorIssue();

  if (status === "success") {
    await reportRecovery(issue);
    return;
  }

  await reportFailure(issue);
}

main().catch((error) => {
  console.error("Failed to update live lead monitoring issue:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
