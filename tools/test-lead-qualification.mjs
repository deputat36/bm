import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Execute the production score function, not a copied scoring model.
// All forms stay outside the test DOM; no fetch and no lead POST occur.
const runtime = fs.readFileSync("assets/js/main.js", "utf8");
const sandbox = {
  document: { querySelectorAll: () => [] },
  window: {},
  URL,
  URLSearchParams
};
vm.runInNewContext(runtime + "\nthis.__scoreLead = qualifyLead;", sandbox, {
  filename: "assets/js/main.js",
  timeout: 5000
});
const qualifyLead = sandbox.__scoreLead;
assert.equal(typeof qualifyLead, "function");

function check(name, payload, score, status, present = [], absent = []) {
  const actual = qualifyLead(payload);
  assert.equal(actual.score, score, `${name}: incorrect score`);
  assert.equal(actual.status, status, `${name}: incorrect status`);
  assert.equal(
    actual.priority,
    status === "hot" ? "срочно обработать" : status === "warm" ? "обработать в рабочий день" : "добавить в прогрев",
    `${name}: wrong priority guidance`
  );
  for (const reason of present) {
    assert.ok(actual.reasons.includes(reason), `${name}: missing ${reason}`);
  }
  for (const reason of absent) {
    assert.ok(!actual.reasons.includes(reason), `${name}: unsupported reason ${reason}`);
  }
}

const phone = "+79031234567";
const budgetReason = "указан бюджет или финансовый ориентир";
const interestReason = "понятен интерес по квартире или услуге";
const methodReason = "указан способ покупки или ипотечная программа";
const timelineReason = "указан срок покупки";
const shortReason = "короткий срок принятия решения";

check("contact only", { phone }, 15, "cold", ["оставлен телефон"], [budgetReason]);
check("question is not budget", { phone, comment: "Расскажите о документах и сроках" }, 15, "cold", [], [budgetReason]);
check("free text never substitutes budget", {
  phone, comment: "Хочу узнать больше", interest: "2-комнатная квартира",
  purchase_method: "Наличные", timeline: "В ближайший месяц"
}, 60, "warm", [interestReason, methodReason, shortReason], [budgetReason]);
check("explicit budget elevates genuinely specified lead", {
  phone, comment: "Хочу узнать больше", budget: "5 млн ₽", interest: "2-комнатная квартира",
  purchase_method: "Наличные", timeline: "В ближайший месяц"
}, 75, "hot", [budgetReason, interestReason, methodReason, shortReason]);
check("all undecided choices are not evidence", {
  phone, budget: "бюджет пока не определён", room_type: "комнатность пока не определена",
  interest: "Пока не определился", purchase_method: "способ покупки пока не определён",
  timeline: "Пока изучаю варианты", comment: "Перезвоните позже"
}, 15, "cold", [], [budgetReason, interestReason, methodReason, timelineReason, shortReason]);
check("unspecified consultation and unknown timeline", {
  phone, budget: "  Пока не знаю ", interest: "Пока не определился",
  purchase_method: "Нужна консультация по вариантам", timeline: "Пока не определился"
}, 15, "cold", [], [budgetReason, interestReason, methodReason, timelineReason]);
check("mortgage interest is meaningful", {
  phone, interest: "Документы по объекту", budget: "4–6 млн ₽",
  purchase_method: "Семейная ипотека", timeline: "В ближайший месяц"
}, 85, "hot", [budgetReason, interestReason, methodReason, shortReason, "нужна ипотечная квалификация"]);
check("mortgage form itself is an intent signal", {
  phone, lead_type: "mortgage", purchase_method: "Нужна консультация по вариантам"
}, 25, "cold", ["нужна ипотечная квалификация"], [methodReason]);
check("independent callback signal preserved", {
  phone, lead_type: "callback", timeline: "пока изучаю"
}, 30, "cold", ["запрошен звонок"], [timelineReason]);
check("future timeline is useful but not urgent", {
  phone, interest: "Студия", timeline: "В течение полугода"
}, 33, "cold", [timelineReason, interestReason], [shortReason]);
check("explicit budget only", { phone, budget: "до 4 млн ₽" }, 30, "cold", [budgetReason]);
check("unknown phone does not produce a phone signal", { phone: "123456789", budget: "5 млн ₽" }, 15, "cold", [budgetReason], ["оставлен телефон"]);

console.log("Lead qualification regression passed: 12 distinct buyer-intent cases, no live submission, stable status boundaries.");
