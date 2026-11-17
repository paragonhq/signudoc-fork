// The look of a composed document. One stylesheet for the editor and for
// the hidden copy the PDF writer measures, so the PDF is what was on screen.
// Everything is in points, like a word processor.
//
// `.composer-editing` adds what only the editor shows: the page-break
// marker, dashed guides for borderless tables, the selected picture.

import { DEFAULT_FONT, DEFAULT_FONT_SIZE_PT } from "./fonts.ts";

export const CHECKBOX_SIZE_PT = 10;
export const CHECKBOX_GAP_PT = 20;
export const LIST_INDENT_PT = 36;
export const INDENT_STEP_PT = 36;

export const DOC_CSS = `
.composer-doc {
  color: #1f1f1f;
  font-family: ${DEFAULT_FONT.stack};
  font-size: ${DEFAULT_FONT_SIZE_PT}pt;
  line-height: 1.15;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  tab-size: 36pt;
  font-kerning: none;
  font-variant-ligatures: none;
  font-feature-settings: "kern" 0, "liga" 0, "clig" 0, "calt" 0;
  font-synthesis: weight style;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  caret-color: #1f1f1f;
  outline: none;
}
.composer-doc * { box-sizing: border-box; }
.composer-doc p, .composer-doc li { margin: 0; }
.composer-doc p[data-style="title"] { font-size: 26pt; margin: 0 0 3pt; line-height: 1.15; }
.composer-doc p[data-style="subtitle"] { font-size: 15pt; color: #666666; margin: 0 0 16pt; }
.composer-doc h1, .composer-doc h2, .composer-doc h3, .composer-doc h4, .composer-doc h5, .composer-doc h6 { font-weight: 700; line-height: 1.15; }
.composer-doc h1 { font-size: 20pt; margin: 18pt 0 6pt; }
.composer-doc h2 { font-size: 16pt; margin: 16pt 0 5pt; }
.composer-doc h3 { font-size: 14pt; margin: 14pt 0 4pt; }
.composer-doc h4 { font-size: 12pt; margin: 12pt 0 4pt; }
.composer-doc h5 { font-size: 11pt; margin: 11pt 0 4pt; }
.composer-doc h6 { font-size: 11pt; margin: 11pt 0 4pt; font-style: italic; color: #555555; }
.composer-doc > :first-child { margin-top: 0; }
.composer-doc strong, .composer-doc b { font-weight: 700; }
.composer-doc a { color: #1155cc; text-decoration-line: underline; }
.composer-doc sup, .composer-doc sub { font-size: 0.7em; line-height: 0; }
.composer-doc code { font-family: "Courier New", "Liberation Mono", Courier, monospace; font-size: 0.92em; background-color: #f1f3f4; }
.composer-doc pre { font-family: "Courier New", "Liberation Mono", Courier, monospace; font-size: 10pt; background-color: #f1f3f4; padding: 8pt 10pt; margin: 6pt 0; white-space: pre-wrap; }
.composer-doc pre code { background-color: transparent; font-size: inherit; }
.composer-doc blockquote { margin: 8pt 0; padding: 0 0 0 12pt; border-left: 3pt solid #dadce0; color: #4a4a4a; }
.composer-doc ul, .composer-doc ol { margin: 0; padding: 0 0 0 ${LIST_INDENT_PT}pt; }
.composer-doc ul { list-style-type: disc; }
.composer-doc ul ul { list-style-type: circle; }
.composer-doc ul ul ul { list-style-type: square; }
.composer-doc ol { list-style-type: decimal; }
.composer-doc ol ol { list-style-type: lower-alpha; }
.composer-doc ol ol ol { list-style-type: lower-roman; }
.composer-doc li::marker { font-variant-numeric: tabular-nums; }
.composer-doc ul[data-type="checklist"] { list-style-type: none; }
.composer-doc ul[data-type="checklist"] > li { position: relative; }
.composer-doc ul[data-type="checklist"] > li::before {
  content: "";
  position: absolute;
  left: -${CHECKBOX_GAP_PT}pt;
  top: calc(0.575em - ${CHECKBOX_SIZE_PT / 2}pt);
  width: ${CHECKBOX_SIZE_PT}pt;
  height: ${CHECKBOX_SIZE_PT}pt;
  border: 1pt solid #5f6368;
  border-radius: 2pt;
  background: #ffffff;
}
.composer-doc ul[data-type="checklist"] > li[data-checked="true"] { color: #80868b; text-decoration-line: line-through; }
.composer-doc ul[data-type="checklist"] > li[data-checked="true"]::before {
  background: #1f1f1f center / 8pt 8pt no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2 5 8.6l4.6-5' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  border-color: #1f1f1f;
}
.composer-doc hr { border: none; border-top: 0.75pt solid #bdc1c6; margin: 10pt 0; height: 0; }
.composer-doc hr[data-page-break] { border: none; margin: 0; height: 0; }
.composer-doc img { max-width: 100%; height: auto; vertical-align: bottom; }
.composer-doc img[data-align="center"] { display: block; margin-left: auto; margin-right: auto; }
.composer-doc img[data-align="right"] { display: block; margin-left: auto; margin-right: 0; }
.composer-doc img[data-align="left"] { display: block; margin-left: 0; margin-right: auto; }
.composer-doc table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 6pt 0; }
.composer-doc td, .composer-doc th { border: 0.75pt solid #1f1f1f; padding: 4pt 6pt; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
.composer-doc th { font-weight: 700; background-color: #f3f3f3; }
.composer-doc table[data-borders="none"] td, .composer-doc table[data-borders="none"] th { border-color: transparent; background-color: transparent; }

.composer-editing hr[data-page-break] {
  height: 18pt;
  margin: 6pt 0;
  border: none;
  background: linear-gradient(transparent calc(50% - 0.5px), #c4c7cc calc(50% - 0.5px), #c4c7cc calc(50% + 0.5px), transparent calc(50% + 0.5px));
  position: relative;
  overflow: visible;
  cursor: default;
}
.composer-editing hr[data-page-break]::after {
  content: "Page break";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 0 8pt;
  background: #ffffff;
  color: #80868b;
  font: 500 8pt/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.composer-editing table[data-borders="none"] td, .composer-editing table[data-borders="none"] th { border: 0.75pt dashed rgba(0, 0, 0, 0.14); }
.composer-editing img { cursor: pointer; }
.composer-editing img[data-selected] { outline: 2px solid var(--accent, #3f22ec); outline-offset: 1px; }
.composer-editing ul[data-type="checklist"] > li::before { cursor: pointer; }
.composer-editing td[data-cell-selected], .composer-editing th[data-cell-selected] { box-shadow: inset 0 0 0 9999px rgba(63, 34, 236, 0.08); }
.composer-editing :is(p, h1, h2, h3, h4, h5, h6):only-child:has(> br:only-child)[data-placeholder]::before {
  content: attr(data-placeholder);
  color: #9aa0a6;
  position: absolute;
  pointer-events: none;
}
.composer-doc ::selection { background: rgba(63, 34, 236, 0.18); }
`;
