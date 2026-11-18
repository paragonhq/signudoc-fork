import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import { matchFont } from "./fonts.ts";
import { markdownToHtml } from "./markdown.ts";
import { matchMarginPreset, matchPageSize, pageDimensions } from "./page.ts";
import { readZip, readZipText } from "./zip.ts";

test("markdown becomes composer HTML", () => {
  assert.equal(
    markdownToHtml("# Title\n\nHello **bold** and *it*."),
    "<h1>Title</h1><p>Hello <strong>bold</strong> and <em>it</em>.</p>",
  );
  assert.equal(
    markdownToHtml("- one\n  - nested\n- two"),
    "<ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul>",
  );
  assert.equal(
    markdownToHtml("3. three\n4. four"),
    '<ol start="3"><li>three</li><li>four</li></ol>',
  );
  assert.equal(
    markdownToHtml("- [x] done\n- [ ] open"),
    '<ul data-type="checklist"><li data-checked="true">done</li><li data-checked="false">open</li></ul>',
  );
  assert.match(
    markdownToHtml("| a | b |\n|---|---|\n| 1 | 2 |"),
    /^<table><tbody><tr><th><p>a<\/p><\/th>/,
  );
});

test("markdown never lets markup or unsafe links through", () => {
  const html = markdownToHtml(
    "<script>x</script> [a](javascript:alert(1)) [b](https://ok.example)",
  );
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes('<a href="https://ok.example">b</a>'));
});

test("pasted font names map to the offered fonts", () => {
  assert.equal(matchFont("Calibri, sans-serif")?.family, "Arial");
  assert.equal(
    matchFont('"Times New Roman", serif')?.family,
    "Times New Roman",
  );
  assert.equal(matchFont("'Open Sans'")?.family, "Open Sans");
  assert.equal(matchFont("Georgia")?.family, "Merriweather");
  assert.equal(matchFont("Wingdings"), null);
});

test("page sizes and margins", () => {
  assert.deepEqual(
    pageDimensions({
      margins: { bottom: 72, left: 72, right: 72, top: 72 },
      orientation: "landscape",
      size: "letter",
    }),
    { height: 612, width: 792 },
  );
  assert.deepEqual(matchPageSize(595, 842), {
    orientation: "portrait",
    size: "a4",
  });
  assert.deepEqual(matchPageSize(1008, 612), {
    orientation: "landscape",
    size: "legal",
  });
  assert.equal(
    matchMarginPreset({ bottom: 36, left: 36, right: 36, top: 36 }),
    "narrow",
  );
  assert.equal(
    matchMarginPreset({ bottom: 10, left: 36, right: 36, top: 36 }),
    null,
  );
});

function buildZip(files: Record<string, string>, compress: boolean) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text);
    const data = compress ? deflateRawSync(raw) : raw;
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(compress ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(compress ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

test("the zip reader inflates stored and deflated entries", async () => {
  for (const compress of [false, true]) {
    const zip = readZip(
      buildZip(
        {
          "word/document.xml": "<w:document>héllo</w:document>",
          "a.txt": "x".repeat(500),
        },
        compress,
      ),
    );
    assert.equal(
      await readZipText(zip, "word/document.xml"),
      "<w:document>héllo</w:document>",
    );
    assert.equal(await readZipText(zip, "a.txt"), "x".repeat(500));
    assert.equal(await readZipText(zip, "missing"), null);
  }
});

test("the zip reader refuses what isn't a zip", () => {
  assert.throws(
    () =>
      readZip(
        new TextEncoder().encode("not a zip at all, just some text here"),
      ),
    /not a valid/,
  );
});
