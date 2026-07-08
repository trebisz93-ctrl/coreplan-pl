// Prerenders the landing page ("/") into dist/index.html so that
// non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot, ...) see real content.
// The client bundle still hydrates on top via createRoot — no hydration
// mismatch guard is needed because createRoot replaces the DOM.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

// Install real DOM globals via jsdom — some deps (sonner, framer-motion,
// supabase-js) touch document/window/localStorage during module import.
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "https://coreplan.pl/",
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const root = process.cwd();
const templatePath = resolve(root, "dist/index.html");
const ssrEntryPath = resolve(root, "dist-ssr/entry-server.js");

const template = readFileSync(templatePath, "utf-8");
const { render } = await import(pathToFileURL(ssrEntryPath).href);

const appHtml = render("/");
const output = template.replace(
  '<div id="root"></div>',
  `<div id="root">${appHtml}</div>`
);

writeFileSync(templatePath, output);
console.log(`prerender: injected ${appHtml.length} chars into dist/index.html`);
