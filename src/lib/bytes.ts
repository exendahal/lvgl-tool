/** Growable byte buffer used while packing pixel data, before it's rendered as a C array or raw binary. */
export class ByteWriter {
  private chunks: number[] = [];

  u8(v: number): void {
    this.chunks.push(v & 0xff);
  }

  u16le(v: number): void {
    this.chunks.push(v & 0xff, (v >>> 8) & 0xff);
  }

  u16be(v: number): void {
    this.chunks.push((v >>> 8) & 0xff, v & 0xff);
  }

  u32le(v: number): void {
    this.chunks.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  }

  bytes(arr: ArrayLike<number>): void {
    for (let i = 0; i < arr.length; i++) this.chunks.push(arr[i] & 0xff);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }

  get length(): number {
    return this.chunks.length;
  }
}

/** Renders bytes as a C array body: `0x00, 0x01, ...` wrapped at a fixed column width. */
export function bytesToCArrayBody(bytes: Uint8Array, perLine = 16): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += perLine) {
    const row = Array.from(bytes.slice(i, i + perLine))
      .map((b) => '0x' + b.toString(16).padStart(2, '0'))
      .join(', ');
    lines.push('    ' + row + ',');
  }
  return lines.join('\n');
}

/** Sanitizes a user-provided string into a valid C identifier. */
export function toCIdentifier(name: string, fallback = 'img'): string {
  let id = name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');
  if (!id) id = fallback;
  return id;
}
