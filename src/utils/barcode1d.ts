const CODE128_PATTERNS: string[] = [
  '11011001100',
  '11001101100',
  '11001100110',
  '10010011000',
  '10010001100',
  '10001001100',
  '10011001000',
  '10011000100',
  '10001100100',
  '11001001000',
  '11001000100',
  '11000100100',
  '10110011100',
  '10011011100',
  '10011001110',
  '10111001100',
  '10011101100',
  '10011100110',
  '11001110010',
  '11001011100',
  '11001001110',
  '11011100100',
  '11001110100',
  '11101101110',
  '11101001100',
  '11100101100',
  '11100100110',
  '11101100100',
  '11100110100',
  '11100110010',
  '11011011000',
  '11011000110',
  '11000110110',
  '10100011000',
  '10001011000',
  '10001000110',
  '10110001000',
  '10001101000',
  '10001100010',
  '11010001000',
  '11000101000',
  '11000100010',
  '10110111000',
  '10110001110',
  '10001101110',
  '10111011000',
  '10111000110',
  '10001110110',
  '11101110110',
  '11010001110',
  '11000101110',
  '11011101000',
  '11011100010',
  '11011101110',
  '11101011000',
  '11101000110',
  '11100010110',
  '11101101000',
  '11101100010',
  '11100011010',
  '11101111010',
  '11001000010',
  '11110001010',
  '10100110000',
  '10100001100',
  '10010110000',
  '10010000110',
  '10000101100',
  '10000100110',
  '10110010000',
  '10110000100',
  '10011010000',
  '10011000010',
  '10000110100',
  '10000110010',
  '11000010010',
  '11001010000',
  '11110111010',
  '11000010100',
  '10001111010',
  '10100111100',
  '10010111100',
  '10010011110',
  '10111100100',
  '10011110100',
  '10011110010',
  '11110100100',
  '11110010100',
  '11110010010',
  '11011011110',
  '11011110110',
  '11110110110',
  '10101111000',
  '10100011110',
  '10001011110',
  '10111101000',
  '10111100010',
  '11110101000',
  '11110100010',
  '10111011110',
  '10111101110',
  '11101011110',
  '11110101110',
  '11010000100',
  '11010010000',
  '11010011100',
  '1100011101011',
];

const CODE128_CHARS = ' !"#%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`{|}~';

const CODE128_START_B = 104;
const CODE128_STOP = 106;

const encodeCode128 = (text: string): number[] => {
  const codes: number[] = [CODE128_START_B];
  let checksum = CODE128_START_B;
  for (let i = 0; i < text.length; i++) {
    const idx = CODE128_CHARS.indexOf(text[i]);
    if (idx === -1) continue;
    const code = idx + 32;
    codes.push(code);
    checksum += code * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(CODE128_STOP);
  return codes;
};

export const generateBarcodeSvg = (
  text: string,
  height = 40,
  showText = true,
  barWidth = 2
): string => {
  const truncated = text.slice(0, 40);
  const codes = encodeCode128(truncated);
  const bars: string[] = [];
  let x = 10;
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        const w = barWidth;
        bars.push(`<rect x="${x}" y="10" width="${w}" height="${height}" fill="#000"/>`);
      }
      x += barWidth;
    }
  }
  const totalWidth = x + 10;
  const textEl = showText
    ? `<text x="${totalWidth / 2}" y="${height + 28}" text-anchor="middle" font-family="monospace" font-size="12" fill="#000">${escapeText(truncated)}</text>`
    : '';
  const svgHeight = showText ? height + 40 : height + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}"><rect width="100%" height="100%" fill="#fff"/>${bars.join('')}${textEl}</svg>`;
};

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const generateBarcodeDataUrl = (
  text: string,
  height = 40,
  showText = true,
  barWidth = 2
): string => {
  const svg = generateBarcodeSvg(text, height, showText, barWidth);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const isCode128Encodable = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    if (CODE128_CHARS.indexOf(text[i]) === -1) return false;
  }
  return text.length > 0 && text.length <= 40;
};
