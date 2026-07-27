const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
}
const gfMul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];

const rsGeneratorPoly = (ecCount: number): number[] => {
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = gen.length - 1; j >= 0; j--) {
      next[j + 1] ^= gen[j];
      next[j] ^= gfMul(gen[j], root);
    }
    gen = next;
  }
  return gen;
};

const rsEncode = (data: number[], ecCount: number): number[] => {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Array(ecCount).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem.shift()!;
    rem.push(0);
    for (let j = 0; j < ecCount; j++) rem[j] ^= gfMul(gen[j + 1], factor);
  }
  return rem;
};

type VersionInfo = {
  version: number;
  size: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  ecBlocks: number;
  dataCodewords: number;
  alignmentPatterns: number[];
};

const VERSIONS: VersionInfo[] = [
  {
    version: 1,
    size: 21,
    totalCodewords: 26,
    ecCodewordsPerBlock: 7,
    ecBlocks: 1,
    dataCodewords: 19,
    alignmentPatterns: [],
  },
  {
    version: 2,
    size: 25,
    totalCodewords: 44,
    ecCodewordsPerBlock: 10,
    ecBlocks: 1,
    dataCodewords: 34,
    alignmentPatterns: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalCodewords: 70,
    ecCodewordsPerBlock: 15,
    ecBlocks: 1,
    dataCodewords: 55,
    alignmentPatterns: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalCodewords: 100,
    ecCodewordsPerBlock: 20,
    ecBlocks: 1,
    dataCodewords: 80,
    alignmentPatterns: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalCodewords: 134,
    ecCodewordsPerBlock: 26,
    ecBlocks: 1,
    dataCodewords: 108,
    alignmentPatterns: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalCodewords: 172,
    ecCodewordsPerBlock: 18,
    ecBlocks: 2,
    dataCodewords: 136,
    alignmentPatterns: [6, 34],
  },
  {
    version: 7,
    size: 45,
    totalCodewords: 196,
    ecCodewordsPerBlock: 20,
    ecBlocks: 2,
    dataCodewords: 156,
    alignmentPatterns: [6, 22, 38],
  },
  {
    version: 8,
    size: 49,
    totalCodewords: 242,
    ecCodewordsPerBlock: 24,
    ecBlocks: 2,
    dataCodewords: 194,
    alignmentPatterns: [6, 24, 42],
  },
  {
    version: 9,
    size: 53,
    totalCodewords: 292,
    ecCodewordsPerBlock: 30,
    ecBlocks: 2,
    dataCodewords: 232,
    alignmentPatterns: [6, 26, 46],
  },
  {
    version: 10,
    size: 57,
    totalCodewords: 346,
    ecCodewordsPerBlock: 18,
    ecBlocks: 2,
    dataCodewords: 274,
    alignmentPatterns: [6, 28, 50],
  },
];

const chooseVersion = (dataLen: number): VersionInfo =>
  VERSIONS.find((v) => v.dataCodewords >= dataLen) || VERSIONS[VERSIONS.length - 1];

const encodeData = (text: string, version: VersionInfo): number[] => {
  const bytes = new TextEncoder().encode(text);
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  push(4, 4);
  push(bytes.length, version.version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const totalBits = version.dataCodewords * 8;
  const terminator = Math.min(4, totalBits - bits.length);
  push(0, terminator);
  if (bits.length % 8) push(0, 8 - (bits.length % 8));
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalBits) {
    push(padBytes[pi], 8);
    pi = (pi + 1) % 2;
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i + j] || 0);
    codewords.push(v);
  }
  return codewords;
};

const buildModuleMatrix = (version: VersionInfo): (boolean | null)[][] => {
  const s = version.size;
  const m: (boolean | null)[][] = Array.from({ length: s }, () => Array(s).fill(null));
  const set = (r: number, c: number, v: boolean) => {
    if (r >= 0 && r < s && c >= 0 && c < s) m[r][c] = v;
  };
  const placeFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const inWhite =
          ((r === 0 || r === 6) && c >= 0 && c <= 6) || ((c === 0 || c === 6) && r >= 0 && r <= 6);
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const val = inInner || (inOuter && !inWhite);
        set(row + r, col + c, val);
      }
  };
  placeFinderPattern(0, 0);
  placeFinderPattern(0, s - 7);
  placeFinderPattern(s - 7, 0);
  for (let i = 8; i < s - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  if (version.alignmentPatterns.length > 0) {
    const ap = version.alignmentPatterns;
    for (const r of ap)
      for (const c of ap) {
        if (m[r]?.[c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++)
          for (let dc = -2; dc <= 2; dc++) {
            const v = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            set(r + dr, c + dc, v);
          }
      }
  }
  set(s - 8, 8, true);
  for (let i = 0; i <= 5; i++) set(i, 8, i === 2);
  for (let i = 0; i <= 5; i++) set(8, i, i === 2 || i === 4);
  set(s - 7, 8, true);
  for (let i = 0; i <= 6; i++) set(8, s - 1 - i, i === 0 || i === 2 || i === 4 || i === 6);
  for (let i = 0; i <= 7; i++) set(i, 8, i === 0 || i === 1 || i === 2);
  set(8, 8, true);
  return m;
};

const placeData = (matrix: (boolean | null)[][], data: number[]) => {
  const s = matrix.length;
  let bitIndex = 0;
  const totalBits = data.length * 8;
  const getBit = (byteIdx: number, bit: number) => ((data[byteIdx] || 0) >> (7 - bit)) & 1;
  let col = s - 1;
  while (col >= 0) {
    if (col === 6) col--;
    for (let upward = 0; upward < 2; upward++) {
      const row = upward === 0 ? s - 1 : 0;
      const dir = upward === 0 ? -1 : 1;
      for (let i = 0; i < s; i++) {
        const r = upward === 0 ? s - 1 - i : i;
        for (let dc = 0; dc <= 1; dc++) {
          const c = col - dc;
          if (c < 0 || matrix[r][c] !== null) continue;
          if (bitIndex < totalBits) {
            matrix[r][c] = getBit(bitIndex >> 3, bitIndex & 7) === 1;
            bitIndex++;
          } else {
            matrix[r][c] = false;
          }
        }
      }
    }
    col -= 2;
  }
};

const applyMask = (matrix: (boolean | null)[][], pattern: number): boolean[][] => {
  const s = matrix.length;
  const masked: boolean[][] = Array.from({ length: s }, () => Array(s).fill(false));
  const maskFn = (r: number, c: number): boolean => {
    switch (pattern) {
      case 0:
        return (r + c) % 2 === 0;
      case 1:
        return r % 2 === 0;
      case 2:
        return c % 3 === 0;
      case 3:
        return (r + c) % 3 === 0;
      case 4:
        return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5:
        return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6:
        return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7:
        return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default:
        return false;
    }
  };
  for (let r = 0; r < s; r++)
    for (let c = 0; c < s; c++) {
      const val = matrix[r][c];
      if (val === null) continue;
      masked[r][c] = val !== maskFn(r, c);
    }
  return masked;
};

const penaltyScore = (grid: boolean[][]): number => {
  const s = grid.length;
  let score = 0;
  for (let r = 0; r < s; r++) {
    let run = 1;
    for (let c = 1; c <= s; c++) {
      if (c < s && grid[r][c] === grid[r][c - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }
  for (let c = 0; c < s; c++) {
    let run = 1;
    for (let r = 1; r <= s; r++) {
      if (r < s && grid[r][c] === grid[r - 1][c]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }
  for (let r = 0; r < s - 1; r++)
    for (let c = 0; c < s - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  return score;
};

const FORMAT_INFO = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0, 0x77c4, 0x72f3, 0x7daa, 0x789d,
  0x662f, 0x6318, 0x6c41, 0x6976, 0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b,
  0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed, 0x0c09, 0x093e, 0x0667, 0x0350,
  0x1de2, 0x18d5, 0x178c, 0x12bb, 0x2fdf, 0x2ae8, 0x25b1, 0x2086, 0x3e34, 0x3b03, 0x345a, 0x316d,
  0x4e92, 0x4ba5, 0x44fc, 0x41cb, 0x5f79, 0x5a4e, 0x5517, 0x5020, 0x6d44, 0x6873, 0x672a, 0x621d,
  0x7caf, 0x7998, 0x76c1, 0x73f6,
];

const placeFormatInfo = (grid: boolean[][], maskPattern: number) => {
  const s = grid.length;
  const bits = FORMAT_INFO[maskPattern];
  const positions = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = ((bits >> (14 - i)) & 1) === 1;
    grid[positions[i][0]][positions[i][1]] = bit;
  }
  const mirror = [
    [s - 1, 8],
    [s - 2, 8],
    [s - 3, 8],
    [s - 4, 8],
    [s - 5, 8],
    [s - 6, 8],
    [s - 7, 8],
    [8, s - 8],
    [8, s - 7],
    [8, s - 6],
    [8, s - 5],
    [8, s - 4],
    [8, s - 3],
    [8, s - 2],
    [8, s - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = ((bits >> (14 - i)) & 1) === 1;
    grid[mirror[i][0]][mirror[i][1]] = bit;
  }
};

export const generateQrSvg = (text: string, moduleSize = 4, margin = 4): string => {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const dataCodewords = encodeData(text, version);
  const ecCount = version.totalCodewords - version.dataCodewords;
  const ecCodewords = rsEncode(dataCodewords, ecCount);
  const allCodewords = [...dataCodewords, ...ecCodewords];
  const matrix = buildModuleMatrix(version);
  placeData(matrix, allCodewords);
  let bestMask = 0;
  let bestScore = Infinity;
  for (let p = 0; p < 8; p++) {
    const masked = applyMask(matrix, p);
    const testGrid: boolean[][] = Array.from({ length: version.size }, (_, r) =>
      Array.from({ length: version.size }, (_, c) => masked[r][c])
    );
    placeFormatInfo(testGrid, p);
    const score = penaltyScore(testGrid);
    if (score < bestScore) {
      bestScore = score;
      bestMask = p;
    }
  }
  const finalGrid = applyMask(matrix, bestMask);
  placeFormatInfo(finalGrid, bestMask);
  const s = version.size;
  const totalModules = s + margin * 2;
  const size = totalModules * moduleSize;
  const rects: string[] = [];
  for (let r = 0; r < s; r++)
    for (let c = 0; c < s; c++) {
      if (finalGrid[r][c]) {
        rects.push(
          `<rect x="${(c + margin) * moduleSize}" y="${(r + margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}" shape-rendering="crispEdges"/>`
        );
      }
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`;
};
