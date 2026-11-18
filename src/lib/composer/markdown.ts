// Markdown to composer HTML: headings, paragraphs, emphasis, strikethrough,
// inline code, links, bulleted / numbered / task lists (nested by indent),
// block quotes, fenced code, horizontal rules and pipe tables. Enough for
// documents written in Markdown; not a full CommonMark implementation.

import { escapeHtml } from "./sanitize.ts";

function inline(text: string) {
  let html = escapeHtml(text);
  const codes: string[] = [];

  html = html.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  html = html
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g,
      (_, alt: string, src: string) =>
        /^https:\/\//.test(src) ? `<img alt="${alt}" src="${src}">` : alt,
    )
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g,
      (_, label: string, href: string) =>
        /^(https?:|mailto:|tel:)/i.test(href)
          ? `<a href="${href}">${label}</a>`
          : label,
    )
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/ {2,}$/g, "<br>");

  return html.replace(
    /\u0000(\d+)\u0000/g,
    (_, index: string) => codes[Number(index)],
  );
}

type ListItem = {
  checked?: boolean;
  indent: number;
  ordered: boolean;
  start: number;
  text: string;
};

function renderList(items: ListItem[]) {
  let out = "";
  const stack: Array<{ indent: number; tag: string }> = [];

  for (const item of items) {
    while (stack.length && stack[stack.length - 1].indent > item.indent) {
      out += `</li></${stack.pop()!.tag}>`;
    }

    const top = stack[stack.length - 1];
    const tag = item.ordered ? "ol" : "ul";

    if (top && top.indent === item.indent) {
      out += "</li>";
    } else {
      const checklist =
        item.checked !== undefined ? ' data-type="checklist"' : "";
      const start =
        item.ordered && item.start > 1 ? ` start="${item.start}"` : "";
      out += `<${tag}${checklist}${start}>`;
      stack.push({ indent: item.indent, tag });
    }

    const checked =
      item.checked === undefined ? "" : ` data-checked="${item.checked}"`;
    out += `<li${checked}>${inline(item.text)}`;
  }

  while (stack.length) {
    out += `</li></${stack.pop()!.tag}>`;
  }

  return out;
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: ListItem[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(renderList(list));
      list = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index];
    const fence = /^\s*(```|~~~)/.exec(line);

    if (fence) {
      flushParagraph();
      flushList();
      const code: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !lines[index].trim().startsWith(fence[1])
      ) {
        code.push(lines[index]);
        index += 1;
      }
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      out.push(
        `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`,
      );
      index += 1;
      continue;
    }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      out.push("<hr>");
      index += 1;
      continue;
    }

    const item = /^(\s*)([-*+]|(\d+)[.)])\s+(\[( |x|X)\]\s+)?(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      list.push({
        checked:
          item[5] === undefined ? undefined : item[5].toLowerCase() === "x",
        indent: item[1].replace(/\t/g, "    ").length,
        ordered: !!item[3],
        start: item[3] ? Number.parseInt(item[3], 10) : 1,
        text: item[6],
      });
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      flushParagraph();
      flushList();
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      out.push(`<blockquote>${markdownToHtml(quote.join("\n"))}</blockquote>`);
      continue;
    }

    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      /^\s*\|?\s*:?-{2,}/.test(lines[index + 1] ?? "")
    ) {
      flushParagraph();
      flushList();
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
      let table = `<table><tbody><tr>${cells(line)
        .map((cell) => `<th><p>${inline(cell)}</p></th>`)
        .join("")}</tr>`;
      index += 2;
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        table += `<tr>${cells(lines[index])
          .map((cell) => `<td><p>${inline(cell)}</p></td>`)
          .join("")}</tr>`;
        index += 1;
      }
      out.push(`${table}</tbody></table>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    if (list.length && /^\s+\S/.test(line)) {
      list[list.length - 1].text += ` ${line.trim()}`;
      index += 1;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  flushList();

  return out.join("");
}
