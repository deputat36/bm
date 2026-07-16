import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOME_PATH = "index.html";
const CSS_PATH = "assets/css/home-polish.css";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const homepage = read(HOME_PATH);
const css = read(CSS_PATH);

if (!homepage || !css) process.exit(1);

const headerLeadCta = 'href="#quick-lead" data-track-action="quick_selection" data-track-placement="header"';
const heroPhoneCta = 'href="tel:+79038576909" data-track-action="phone" data-track-placement="hero"';

for (const fragment of [
  'class="hero__content hero__content--conversion"',
  headerLeadCta,
  heroPhoneCta,
  'id="quick-lead" data-primary-lead',
  'data-form-id="homepage_quick_selection"'
]) {
  if (!homepage.includes(fragment)) errors.push(`${HOME_PATH}: missing ${fragment}`);
}

if (count(homepage, "<form ") !== 2) {
  errors.push(`${HOME_PATH}: mobile CTA change must not alter the two-form homepage contract`);
}

if (count(homepage, headerLeadCta) !== 1) {
  errors.push(`${HOME_PATH}: header lead CTA contract must remain unique`);
}

if (count(homepage, heroPhoneCta) !== 1) {
  errors.push(`${HOME_PATH}: hero phone CTA contract must remain unique`);
}

for (const fragment of [
  "@media(max-width:760px)",
  "body:has(.hero__content--conversion)",
  "env(safe-area-inset-bottom,0px)",
  '.nav .button[href="#quick-lead"]',
  '.hero__pitch .hero__actions a[href^="tel:"]',
  "position:fixed",
  "z-index:999",
  "scroll-margin-bottom:100px",
  'content:"Позвонить"'
]) {
  if (!css.includes(fragment)) errors.push(`${CSS_PATH}: missing ${fragment}`);
}

const mobileSectionStart = css.indexOf("/* Главная: мобильная панель быстрого звонка и заявки. */");
if (mobileSectionStart < 0) {
  errors.push(`${CSS_PATH}: mobile conversion section marker is missing`);
} else {
  const mobileSection = css.slice(mobileSectionStart);
  if (!mobileSection.includes("body:has(.hero__content--conversion)::after")) {
    errors.push(`${CSS_PATH}: fixed action background must be scoped to the homepage`);
  }
  if (!mobileSection.includes("pointer-events:none")) {
    errors.push(`${CSS_PATH}: background layer must not block taps`);
  }
  if (!mobileSection.includes("width:calc(50% - 18px)")) {
    errors.push(`${CSS_PATH}: phone and lead controls must share the mobile width`);
  }
}

console.log("Homepage mobile CTA controls: 2");
console.log("New forms: 0");
console.log("Homepage-only scope: enabled");
console.log("Safe-area support: enabled");

if (errors.length) {
  console.error("\nHomepage mobile CTA validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage mobile CTA validation passed.");
