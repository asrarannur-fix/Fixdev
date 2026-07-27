import type { PrintConfig } from './print';

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: false,
  text: 'COPY',
  fontSize: 48,
  color: '#d1d5db',
  opacity: 0.15,
  rotation: -45,
  position: 'center',
};

const POSITION_STYLES: Record<string, string> = {
  center: 'top:50%;left:50%;transform:translate(-50%,-50%) rotate(VROT)',
  'top-left': 'top:40px;left:20px;transform:rotate(VROT)',
  'top-right': 'top:40px;right:20px;transform:rotate(VROT)',
  'bottom-left': 'bottom:40px;left:20px;transform:rotate(VROT)',
  'bottom-right': 'bottom:40px;right:20px;transform:rotate(VROT)',
};

export const buildWatermarkOverlay = (config?: Partial<WatermarkConfig>): string => {
  const cfg = { ...DEFAULT_WATERMARK, ...config };
  if (!cfg.enabled || !cfg.text) return '';
  const pos = (POSITION_STYLES[cfg.position] || POSITION_STYLES.center).replace(
    'VROT',
    `${cfg.rotation}deg`
  );
  const encoded = cfg.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div style="position:fixed;${pos};font-size:${cfg.fontSize}px;font-weight:bold;color:${cfg.color};opacity:${cfg.opacity};pointer-events:none;z-index:9999;white-space:nowrap;font-family:Arial,sans-serif">${encoded}</div>`;
};

export const getWatermarkConfig = (printConfig?: PrintConfig): Partial<WatermarkConfig> => {
  if (!printConfig) return {};
  const wm = (printConfig as Record<string, unknown>).watermark as
    Partial<WatermarkConfig> | undefined;
  return wm || {};
};

export const applyWatermarkToHtml = (
  html: string,
  watermarkConfig?: Partial<WatermarkConfig>
): string => {
  const overlay = buildWatermarkOverlay(watermarkConfig);
  if (!overlay) return html;
  return html.replace('</body>', `${overlay}</body>`);
};

export { DEFAULT_WATERMARK };
