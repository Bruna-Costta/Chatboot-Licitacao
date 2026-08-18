// Declared multipart content-type is client-supplied and spoofable — this checks the
// actual file bytes against known magic numbers as an authoritative second check.
const SIGNATURE_CHECKS: Record<string, (bytes: Uint8Array) => boolean> = {
  "application/pdf": (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46]), // %PDF
  "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/webp": (bytes) =>
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    bytes.length >= 12 &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]), // WEBP
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

export function matchesDeclaredMimeType(data: ArrayBuffer, mimeType: string): boolean {
  const check = SIGNATURE_CHECKS[mimeType];
  if (!check) return false;
  return check(new Uint8Array(data));
}
