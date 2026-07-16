import fs from "node:fs";

const filePath = "index.html";
let html = fs.readFileSync(filePath, "utf8");

const before = '<article class="card card--shadow"><h3>Нужен подбор новостройки</h3><p>Оставьте короткую заявку. Специалист уточнит бюджет, комнатность и подходящий способ покупки.</p><div class="hero__actions"><a class="button" href="#quick-lead" data-track-action="route_selection" data-track-placement="homepage_route_selection">Начать подбор</a></div></article>';
const after = '<article class="card card--shadow"><h3>Нужен подбор новостройки</h3><p>Ответьте на пять вопросов, получите предварительный следующий шаг и только потом решите, оставлять ли контакты.</p><div class="hero__actions"><a class="button" href="catalog/#quiz" data-track-action="route_selection" data-track-placement="homepage_route_selection">Пройти подбор</a></div></article>';

if (!html.includes(before)) {
  throw new Error("Homepage selection route fragment not found");
}

html = html.replace(before, after);

if (!html.includes('href="catalog/#quiz" data-track-action="route_selection" data-track-placement="homepage_route_selection">Пройти подбор</a>')) {
  throw new Error("Homepage quiz route was not connected");
}
if ((html.split('data-track-placement="homepage_route_selection"').length - 1) !== 1) {
  throw new Error("Homepage selection placement must remain unique");
}

fs.writeFileSync(filePath, html, "utf8");
console.log("Homepage selection route connected to catalog quiz.");
