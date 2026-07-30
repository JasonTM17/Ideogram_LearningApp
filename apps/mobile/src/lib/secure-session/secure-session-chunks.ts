export interface SessionChunks {
  byteLength: number;
  chunks: string[];
}

const utf8ByteLengthOfSymbol = (symbol: string): number => {
  const codePoint = symbol.codePointAt(0);

  if (codePoint === undefined) {
    return 0;
  }

  if (codePoint <= 0x7f) {
    return 1;
  }

  if (codePoint <= 0x7ff) {
    return 2;
  }

  return codePoint <= 0xffff ? 3 : 4;
};

export const getUtf8ByteLength = (value: string): number => {
  let byteLength = 0;

  for (const symbol of value) {
    byteLength += utf8ByteLengthOfSymbol(symbol);
  }

  return byteLength;
};

export const splitIntoUtf8Chunks = (
  value: string,
  maximumChunkBytes: number,
  maximumChunks: number,
): SessionChunks => {
  const chunks: string[] = [];
  let byteLength = 0;
  let currentChunk = '';
  let currentChunkBytes = 0;

  for (const symbol of value) {
    const symbolBytes = utf8ByteLengthOfSymbol(symbol);

    if (currentChunkBytes + symbolBytes > maximumChunkBytes) {
      chunks.push(currentChunk);
      currentChunk = '';
      currentChunkBytes = 0;

      if (chunks.length >= maximumChunks) {
        throw new RangeError('Secure session value exceeds the configured storage limit.');
      }
    }

    currentChunk += symbol;
    currentChunkBytes += symbolBytes;
    byteLength += symbolBytes;
  }

  chunks.push(currentChunk);

  if (chunks.length > maximumChunks) {
    throw new RangeError('Secure session value exceeds the configured storage limit.');
  }

  return { byteLength, chunks };
};
