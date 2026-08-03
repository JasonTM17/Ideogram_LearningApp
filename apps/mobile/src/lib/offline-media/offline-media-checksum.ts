export const toHexChecksum = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');

export const matchesExpectedSha256 = (checksum: string, expectedSha256: string): boolean =>
  checksum === expectedSha256;
