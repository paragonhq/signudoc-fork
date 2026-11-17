// A small ZIP reader, enough for Office documents (.docx is a ZIP of XML
// files). It reads the central directory and inflates entries with the
// browser's own DecompressionStream, so no library is needed.
//
// Not handled: ZIP64 (files over 4 GB) and encrypted entries. Neither occurs
// in a document someone would sign.

export type ZipEntries = Map<string, () => Promise<Uint8Array>>;

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function readZip(buffer: ArrayBuffer | Uint8Array): ZipEntries {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;

  // The end record sits in the last 64 KB + 22 bytes (it may carry a comment).
  for (
    let offset = bytes.byteLength - 22;
    offset >= Math.max(0, bytes.byteLength - 65557);
    offset -= 1
  ) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      end = offset;
      break;
    }
  }

  if (end < 0) {
    throw new ZipError("This file is not a valid document archive.");
  }

  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const entries: ZipEntries = new Map();
  const decoder = new TextDecoder();

  for (let index = 0; index < count; index += 1) {
    if (
      cursor + 46 > bytes.byteLength ||
      view.getUint32(cursor, true) !== CENTRAL_FILE_HEADER
    ) {
      throw new ZipError("This document archive is damaged.");
    }

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );

    cursor += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith("/")) {
      continue;
    }

    entries.set(name, async () => {
      if (flags & 1) {
        throw new ZipError("This document is password-protected.");
      }

      if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER) {
        throw new ZipError("This document archive is damaged.");
      }

      const localName = view.getUint16(localOffset + 26, true);
      const localExtra = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localName + localExtra;
      const data = bytes.subarray(start, start + compressedSize);

      if (method === 0) {
        return data.slice();
      }

      if (method === 8) {
        return inflateRaw(data);
      }

      throw new ZipError("This document uses an unsupported compression.");
    });
  }

  return entries;
}

export async function readZipText(entries: ZipEntries, name: string) {
  const read = entries.get(name);

  return read ? new TextDecoder().decode(await read()) : null;
}
