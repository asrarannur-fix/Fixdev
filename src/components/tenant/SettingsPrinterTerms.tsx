import * as React from 'react';
import { useToast } from '../ui/Toast';
import { escapeHtml, resolvePrintConfig } from '../../utils/print';
import {
  createPrintDocument,
  detectPrinterCapabilities,
  autoDetectPrinterSettings,
} from '../../utils/printJob';
import {
  Building2,
  Sliders,
  Receipt,
  Lock,
  Zap,
  FileText,
  ChevronRight,
  HelpCircle,
  Save,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Copy,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Download,
  Brush,
  Ticket,
  X,
  Paintbrush,
  Wrench,
  Fingerprint,
  MapPin,
  Search,
  Server,
  Smartphone,
  Globe,
  MessageSquare,
  Shield,
  Settings,
  GitBranch,
  Printer,
  Code,
  CreditCard,
  ArrowRightLeft,
  Play,
  Pencil,
  Check,
  Barcode,
  ShieldCheck,
  Eye,
  CheckSquare,
  Plus,
  RefreshCw,
  Send,
  Database,
  FileSpreadsheet,
  Gift,
  ClipboardCheck,
  History,
  HeartPulse,
  Radar,
  FileCode,
  BarChart3,
  ScanSearch,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Tenant, Branch, WorkflowRule, UserRole, TenantBranding } from '../../types';
import { PrintHistory } from '../PrintHistory';
import { PrintAnalytics } from '../PrintAnalytics';
import { PrintTemplateManager } from '../PrintTemplateManager';
import { PrintQueueVisualization } from '../PrintQueueVisualization';
import { PrintCostTracker } from '../PrintCostTracker';
import { checkQzTray } from '../../utils/printJob';
import { DEFAULT_WATERMARK } from '../../utils/watermark';

type ConfigTab = 'koneksi' | 'profil' | 'tampilan' | 'label' | 'sk';

const CONFIG_TABS: { key: ConfigTab; icon: React.FC<any>; label: string }[] = [
  { key: 'koneksi', icon: Server, label: 'Koneksi' },
  { key: 'profil', icon: Sliders, label: 'Profil' },
  { key: 'tampilan', icon: Paintbrush, label: 'Tampilan' },
  { key: 'label', icon: Barcode, label: 'Label' },
  { key: 'sk', icon: ShieldCheck, label: 'S&K' },
];

export const SettingsPrinterTerms: React.FC<any> = (props) => {
  const {
    activeTenant,
    branches,
    currentBranchId,
    profileDocumentType,
    setProfileDocumentType,
    customFooterText,
    customHeaderTitle,
    publicBaseUrl,
    handleDirectPrintLabel,
    labelCustomText,
    labelFontSize,
    labelHeight,
    labelShowLogo,
    labelShowQr,
    labelWidth,
    paperSize,
    printMode,
    printerName,
    qzStatus,
    qzPrinters,
    qzChecking,
    checkPrinterConnection,
    testConfiguredPrinter,
    printCustomerNotes,
    printFontSize,
    printHeaderLogo,
    printMargin,
    printPreviewType,
    printQrCode,
    printTermsAndConditions,
    savePrinterSettings,
    setPrintPreviewType,
    setSkActiveTab,
    showConfirm,
    showTermsInTracking,
    showToast,
    skActiveTab,
    termsAndConditionsText,
    termsRentalText,
    termsSalesText,
    apiFetch,
  } = props;
  const [settingsView, setSettingsView] = React.useState<
    'config' | 'history' | 'analytics' | 'templates' | 'queue' | 'cost'
  >('config');
  const [configTab, setConfigTab] = React.useState<ConfigTab>('koneksi');
  const [thermalCompact, setThermalCompact] = React.useState(
    activeTenant?.settings?.printConfig?.thermalCompact ?? false
  );
  const [healthStatus, setHealthStatus] = React.useState<'idle' | 'checking' | 'ok' | 'fail'>(
    'idle'
  );
  const [healthPrinters, setHealthPrinters] = React.useState<string[]>([]);
  const [discoveredPrinters, setDiscoveredPrinters] = React.useState<
    Array<{ name: string; caps: any }>
  >([]);
  const [autoDetecting, setAutoDetecting] = React.useState(false);
  const [printTemplates, setPrintTemplates] = React.useState<Record<string, string>>(
    (activeTenant?.settings?.printConfig?.printTemplates as Record<string, string>) || {}
  );
  const [multiPrinterMap, setMultiPrinterMap] = React.useState<Record<string, string>>(
    (activeTenant?.settings?.printConfig?.multiPrinterMap as Record<string, string>) || {}
  );

  React.useEffect(() => {
    setThermalCompact(activeTenant?.settings?.printConfig?.thermalCompact ?? false);
  }, [activeTenant?.settings?.printConfig?.thermalCompact]);

  const runHealthCheck = React.useCallback(async () => {
    setHealthStatus('checking');
    try {
      const result = await checkQzTray();
      setHealthPrinters(result.printers);
      setHealthStatus(result.connected ? 'ok' : 'fail');
    } catch {
      setHealthStatus('fail');
    }
  }, []);

  React.useEffect(() => {
    if (printMode === 'qz') runHealthCheck();
  }, [printMode, runHealthCheck]);

  const runAutoDiscovery = React.useCallback(async () => {
    setAutoDetecting(true);
    try {
      const result = await checkQzTray();
      if (!result.connected || result.printers.length === 0) {
        setDiscoveredPrinters([]);
        setAutoDetecting(false);
        return;
      }
      const discovered: Array<{ name: string; caps: any }> = [];
      for (const name of result.printers) {
        try {
          const caps = await detectPrinterCapabilities(name);
          discovered.push({ name, caps });
        } catch {
          discovered.push({ name, caps: null });
        }
      }
      setDiscoveredPrinters(discovered);
    } catch {
      setDiscoveredPrinters([]);
    } finally {
      setAutoDetecting(false);
    }
  }, []);

  const applyDiscoveredPrinter = React.useCallback(
    async (name: string) => {
      const settings = await autoDetectPrinterSettings(name);
      if (settings) {
        savePrinterSettings({
          ...settings,
          printMode: 'qz',
        });
        showToast(`Printer "${name}" berhasil dikonfigurasi otomatis.`, 'success');
      }
    },
    [savePrinterSettings, showToast]
  );
  const selectedProfile =
    resolvePrintConfig(activeTenant?.settings?.printConfig, currentBranchId, profileDocumentType) ||
    {};
  const previewPrintConfig = {
    paperSize,
    printMode,
    printerName,
    printFontSize,
    printMargin,
    printQrCode,
    printHeaderLogo,
    printCustomerNotes,
    printTermsAndConditions,
    customHeaderTitle,
    customFooterText,
    termsAndConditionsText,
    ...selectedProfile,
  };
  const previewBody = `
    <section>
      <header style="text-align:center;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:10px">
        <h1 style="font-size:16px;margin:0">${escapeHtml(customHeaderTitle.trim() || activeTenant?.name || 'NAMA TOKO')}</h1>
        <div style="font-size:9px;margin-top:3px">BUKTI PENERIMAAN UNIT SERVIS</div>
        <strong style="display:block;margin-top:6px">TIKET: #SVC-2026-0099</strong>
      </header>
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          <tr><td>Pelanggan</td><td style="text-align:right;font-weight:bold">Ahmad Dahlan (0812-4455-xxxx)</td></tr>
          <tr><td>Tanggal Diterima</td><td style="text-align:right">01 Juli 2026</td></tr>
          <tr><td>Nama Perangkat</td><td style="text-align:right;font-weight:bold">PlayStation 5 Slim</td></tr>
          <tr><td>Brand & Model</td><td style="text-align:right">Sony - CFI-2016</td></tr>
          ${printCustomerNotes ? '<tr><td>Keluhan Utama</td><td style="text-align:right">Overheating & mati mendadak saat game 4K</td></tr>' : ''}
          <tr><td style="padding-top:8px">Jenis Layanan</td><td style="padding-top:8px;text-align:right;font-weight:bold">Reparasi Penuh & Cleaning</td></tr>
          <tr><td>Estimasi Biaya</td><td style="text-align:right;font-weight:bold">Rp 350.000</td></tr>
          <tr><td>Status Awal</td><td style="text-align:right;font-weight:bold">DITERIMA</td></tr>
        </tbody>
      </table>
      ${printQrCode ? '<div style="border:1px solid #000;margin-top:12px;padding:8px;text-align:center;font-weight:bold">STATUS TIKET: SVC-2026-0099<br><small>Gunakan nomor tiket saat menghubungi toko</small></div>' : ''}
      ${printTermsAndConditions && termsAndConditionsText.trim() ? `<div style="border-top:1px dashed #000;margin-top:12px;padding-top:8px;white-space:pre-wrap"><strong>SYARAT & KETENTUAN LAYANAN (SERVIS):</strong><br>${escapeHtml(termsAndConditionsText.trim())}</div>` : ''}
      <footer style="border-top:1px dashed #000;margin-top:12px;padding-top:8px;text-align:center;white-space:pre-wrap">${escapeHtml(customFooterText || '')}</footer>
    </section>`;
  const previewDocument = createPrintDocument(
    'Pratinjau Nota Penerimaan',
    previewBody,
    previewPrintConfig,
    printQrCode ? 'https://fixdev.web.id/track/SVC-2026-0099' : undefined
  );
  const previewWidth = paperSize === 'thermal_58' ? 204 : paperSize === 'thermal_80' ? 287 : 794;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_input]:bg-zinc-950 dark:[&_input]:text-zinc-100 dark:[&_textarea]:bg-zinc-950 dark:[&_textarea]:text-zinc-100 dark:[&_select]:bg-zinc-950 dark:[&_select]:text-zinc-100 dark:[&_.hover\:bg-slate-50:hover]:bg-zinc-900">
      {/* Top View Toggle */}
      <div className="xl:col-span-12 flex items-center gap-2 flex-wrap">
        {[
          { key: 'config' as const, icon: Settings, label: 'Konfigurasi' },
          { key: 'history' as const, icon: History, label: 'Riwayat' },
          { key: 'analytics' as const, icon: BarChart3, label: 'Analitik' },
          { key: 'templates' as const, icon: FileCode, label: 'Template' },
          { key: 'queue' as const, icon: Clock, label: 'Antrian' },
          { key: 'cost' as const, icon: DollarSign, label: 'Biaya' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setSettingsView(key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              settingsView === key
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Icon className="w-3 h-3 inline mr-1" /> {label}
          </button>
        ))}
      </div>

      {settingsView === 'history' && apiFetch && currentBranchId ? (
        <div className="xl:col-span-12">
          <PrintHistory apiFetch={apiFetch} branchId={currentBranchId} />
        </div>
      ) : settingsView === 'analytics' && apiFetch && currentBranchId ? (
        <div className="xl:col-span-12">
          <PrintAnalytics apiFetch={apiFetch} branchId={currentBranchId} />
        </div>
      ) : settingsView === 'templates' ? (
        <div className="xl:col-span-12">
          <PrintTemplateManager
            printTemplates={printTemplates}
            onSave={(t) => {
              setPrintTemplates(t);
              savePrinterSettings({ printTemplates: t });
            }}
          />
        </div>
      ) : settingsView === 'queue' ? (
        <div className="xl:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <PrintQueueVisualization />
        </div>
      ) : settingsView === 'cost' ? (
        <div className="xl:col-span-12 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <PrintCostTracker />
        </div>
      ) : (
        <>
          {/* Left Configuration Column */}
          <div className="xl:col-span-6 space-y-4">
            {/* Status Alert */}
            {printerName ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 bg-emerald-500 text-white rounded-md">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Printer Aktif</p>
                    <p className="text-[10px] text-emerald-600">{printerName} — Siap mencetak</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  Ready
                </span>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 bg-slate-300 text-white rounded-md">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Belum Dikonfigurasi</p>
                    <p className="text-[10px] text-slate-500">Atur printer di tab Koneksi.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tabs for Config */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
                {CONFIG_TABS.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setConfigTab(key)}
                    className={`flex-1 min-w-0 px-3 py-2.5 text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                      configTab === key
                        ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="w-3 h-3 inline mr-1" /> {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {configTab === 'koneksi' && (
                  <div className="space-y-5">
                    {/* QZ Tray Connection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-xs uppercase text-slate-800">QZ Tray</h4>
                          <p className="text-[10px] text-slate-400">
                            Koneksi printer otomatis via aplikasi lokal.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              healthStatus === 'ok'
                                ? 'bg-emerald-100 text-emerald-700'
                                : healthStatus === 'fail'
                                  ? 'bg-red-100 text-red-700'
                                  : healthStatus === 'checking'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {healthStatus === 'ok'
                              ? `Sehat (${healthPrinters.length})`
                              : healthStatus === 'fail'
                                ? 'Offline'
                                : healthStatus === 'checking'
                                  ? 'Cek...'
                                  : qzStatus || 'Belum dicek'}
                          </span>
                          {printMode === 'qz' && (
                            <button
                              onClick={runHealthCheck}
                              disabled={healthStatus === 'checking'}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                              title="Health check"
                            >
                              <HeartPulse className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          type="button"
                          onClick={checkPrinterConnection}
                          disabled={qzChecking}
                          className="px-3 py-2 rounded-lg bg-accent text-white text-[10px] font-bold disabled:opacity-50"
                        >
                          {qzChecking ? 'Mengecek...' : 'Cek Koneksi & Cari Printer'}
                        </button>
                        <button
                          type="button"
                          onClick={testConfiguredPrinter}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                        >
                          Test Print
                        </button>
                      </div>
                      {qzPrinters.length > 0 && (
                        <select
                          value={printerName || ''}
                          onChange={(e) => savePrinterSettings({ printerName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        >
                          <option value="">Pilih printer terdeteksi</option>
                          {qzPrinters.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
                        <div className="font-bold mb-1">Belum punya QZ Tray?</div>
                        <p className="mb-2">Install di komputer kasir, lalu buka ulang browser.</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href="https://qz.io/download/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"
                          >
                            <ExternalLink className="h-3 w-3" /> Download
                          </a>
                          <a
                            href="/api/qz/installer.bat"
                            download
                            className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 font-bold text-white hover:bg-accent-hover"
                          >
                            <Download className="h-3 w-3" /> Setup Windows 7+
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Discovery */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-xs uppercase text-slate-800">
                            Auto-Discovery
                          </h4>
                          <p className="text-[10px] text-slate-400">Scan & konfigurasi otomatis.</p>
                        </div>
                        <button
                          type="button"
                          onClick={runAutoDiscovery}
                          disabled={autoDetecting}
                          className="px-3 py-2 rounded-lg bg-violet-600 text-white text-[10px] font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          <ScanSearch
                            className={`w-3 h-3 ${autoDetecting ? 'animate-spin' : ''}`}
                          />
                          {autoDetecting ? 'Scanning...' : 'Scan'}
                        </button>
                      </div>
                      {discoveredPrinters.length > 0 && (
                        <div className="space-y-2">
                          {discoveredPrinters.map(({ name, caps }) => (
                            <div
                              key={name}
                              className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                            >
                              <div className="flex items-center gap-2">
                                <Printer className="w-4 h-4 text-slate-400" />
                                <div>
                                  <span className="text-[10px] font-bold text-slate-800">
                                    {name}
                                  </span>
                                  {caps && (
                                    <span className="text-[8px] text-slate-400 ml-2 font-mono">
                                      {caps.defaultPaperSize} {caps.supportsCut ? '| CUT' : ''}{' '}
                                      {caps.supportsDensity ? '| DENSITY' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => applyDiscoveredPrinter(name)}
                                className="px-2.5 py-1 bg-accent text-white text-[9px] font-bold rounded-lg hover:bg-accent-hover"
                              >
                                <Check className="w-3 h-3 inline mr-0.5" /> Pakai
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Multi-Printer Map */}
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="font-bold text-xs uppercase text-slate-800 mb-1">
                        Multi-Printer Map
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-3">
                        Assign printer per jenis dokumen.
                      </p>
                      <div className="space-y-2">
                        {[
                          'pos_receipt',
                          'service_receipt',
                          'service_invoice',
                          'service_label',
                          'warranty',
                          'rental',
                          'inventory',
                          'report',
                        ].map((docType) => (
                          <div key={docType} className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-slate-500 w-28 truncate">
                              {docType}
                            </span>
                            <select
                              value={multiPrinterMap[docType] || ''}
                              onChange={(e) => {
                                const next = { ...multiPrinterMap };
                                if (e.target.value) next[docType] = e.target.value;
                                else delete next[docType];
                                setMultiPrinterMap(next);
                                savePrinterSettings({ multiPrinterMap: next });
                              }}
                              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-semibold"
                            >
                              <option value="">Default</option>
                              {qzPrinters.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'profil' && (
                  <div className="space-y-4">
                    {/* Branch & Document Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Cabang Aktif
                        <input
                          readOnly
                          value={
                            branches?.find((b: any) => b.id === currentBranchId)?.name ||
                            currentBranchId ||
                            '-'
                          }
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50"
                        />
                      </label>
                      <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Jenis Dokumen
                        <select
                          aria-label="Jenis Dokumen Profil"
                          value={profileDocumentType}
                          onChange={(e) => setProfileDocumentType(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        >
                          {[
                            'default',
                            'pos_receipt',
                            'service_receipt',
                            'service_invoice',
                            'service_label',
                            'warranty',
                            'rental',
                            'inventory',
                            'report',
                          ].map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Core Settings Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Mode', 'printMode', 'select', ['browser', 'qz']],
                        ['Nama Printer', 'printerName', 'text'],
                        [
                          'Kertas',
                          'paperSize',
                          'select',
                          ['thermal_58', 'thermal_80', 'hvs_a4', 'hvs_letter'],
                        ],
                        ['Margin mm', 'printMargin', 'number'],
                        ['Lebar mm', 'printableWidthMm', 'number'],
                        ['Tinggi mm', 'printableHeightMm', 'number'],
                        ['Orientasi', 'orientation', 'select', ['portrait', 'landscape']],
                        ['Densitas', 'density', 'number'],
                        ['Salinan', 'copies', 'number'],
                        ['Feed', 'feed', 'number'],
                        [
                          'Cetak Ulang',
                          'reprintPolicy',
                          'select',
                          ['allow', 'reason_required', 'deny'],
                        ],
                        ['Batas Ulang', 'reprintCopyCap', 'number'],
                      ].map(([label, key, kind, values]: any) => (
                        <label
                          key={key}
                          className="text-[10px] font-mono text-slate-400 uppercase font-bold"
                        >
                          {label}
                          {kind === 'select' ? (
                            <select
                              aria-label={label}
                              value={
                                (selectedProfile as any)[key] ??
                                (key === 'printMode'
                                  ? 'browser'
                                  : key === 'orientation'
                                    ? 'portrait'
                                    : key === 'reprintPolicy'
                                      ? 'reason_required'
                                      : values[0])
                              }
                              onChange={(e) =>
                                savePrinterSettings({
                                  profileSnapshot: true,
                                  [key]: e.target.value,
                                })
                              }
                              className="mt-1 w-full px-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                            >
                              {values.map((v: string) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-label={label}
                              type={kind}
                              min="0"
                              value={(selectedProfile as any)[key] ?? ''}
                              onChange={(e) =>
                                savePrinterSettings({
                                  profileSnapshot: true,
                                  [key]: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              className="mt-1 w-full px-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                            />
                          )}
                        </label>
                      ))}
                      <label className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Potong Kertas
                        <input
                          aria-label="Potong Kertas"
                          type="checkbox"
                          checked={selectedProfile.cut ?? false}
                          onChange={(e) =>
                            savePrinterSettings({ profileSnapshot: true, cut: e.target.checked })
                          }
                          className="ml-3"
                        />
                      </label>
                    </div>

                    {/* Paper Size Helper */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                        Ukuran Kertas Media
                      </label>
                      <select
                        value={paperSize}
                        onChange={(e) => savePrinterSettings({ paperSize: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold"
                      >
                        <option value="thermal_58">Thermal 58 mm</option>
                        <option value="thermal_80">Thermal 80 mm</option>
                        <option value="hvs_a4">HVS A4</option>
                        <option value="hvs_letter">HVS Letter</option>
                      </select>
                    </div>

                    {/* Margin Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
                          Margin
                        </label>
                        <span className="text-[10px] font-mono font-bold text-accent bg-accent-lighter px-2 py-0.5 rounded">
                          {printMargin} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        value={printMargin}
                        onChange={(e) =>
                          savePrinterSettings({ printMargin: Number(e.target.value) })
                        }
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                      <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-1">
                        <span>0 mm</span>
                        <span>12 mm</span>
                        <span>25 mm</span>
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'tampilan' && (
                  <div className="space-y-4">
                    {/* Font Size */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 font-bold">
                        Ukuran Font
                      </label>
                      <select
                        value={printFontSize}
                        onChange={(e) => savePrinterSettings({ printFontSize: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold"
                      >
                        <option value="sm">Kecil (Eco-Print)</option>
                        <option value="base">Sedang (Default)</option>
                        <option value="lg">Besar (Jelas)</option>
                      </select>
                    </div>

                    {/* Toggle Options */}
                    <div className="space-y-2">
                      {[
                        {
                          key: 'printQrCode',
                          label: 'QR Code Lacak',
                          desc: 'QR untuk dipindai pelanggan',
                          checked: printQrCode,
                        },
                        {
                          key: 'thermalCompact',
                          label: 'Mode Kompak',
                          desc: 'Font kecil, margin tipis, hemat kertas',
                          checked: thermalCompact,
                        },
                        {
                          key: 'printHeaderLogo',
                          label: 'Logo Header',
                          desc: 'Tampilkan nama toko di atas nota',
                          checked: printHeaderLogo,
                        },
                        {
                          key: 'printCustomerNotes',
                          label: 'Keluhan Unit',
                          desc: 'Sertakan detail keluhan pelanggan',
                          checked: printCustomerNotes,
                        },
                        {
                          key: 'printTermsAndConditions',
                          label: 'Syarat & Garansi',
                          desc: 'Sertakan S&K di nota',
                          checked: printTermsAndConditions,
                        },
                        {
                          key: 'showTermsInTracking',
                          label: 'S&K di Portal Lacak',
                          desc: 'Sertakan S&K di portal online',
                          checked: showTermsInTracking,
                        },
                      ].map(({ key, label, desc, checked }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 block">{label}</span>
                            <span className="text-[9px] text-slate-400 block">{desc}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (key === 'thermalCompact') {
                                setThermalCompact(e.target.checked);
                                savePrinterSettings({ thermalCompact: e.target.checked });
                              } else {
                                savePrinterSettings({ [key]: e.target.checked });
                              }
                            }}
                            className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Watermark */}
                    <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-700 block">
                            Watermark Kustom
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            Watermark otomatis pada dokumen cetak
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            !!(activeTenant?.settings?.printConfig as any)?.watermark?.enabled
                          }
                          onChange={(e) => {
                            const cur =
                              (activeTenant?.settings?.printConfig as any)?.watermark || {};
                            savePrinterSettings({
                              watermark: { ...cur, enabled: e.target.checked },
                            } as any);
                          }}
                          className="w-4.5 h-4.5 rounded text-accent focus:ring-accent border-slate-300 cursor-pointer"
                        />
                      </div>
                      {(activeTenant?.settings?.printConfig as any)?.watermark?.enabled && (
                        <div className="space-y-2 pl-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Teks watermark"
                              defaultValue={
                                (activeTenant?.settings?.printConfig as any)?.watermark?.text ||
                                'COPY'
                              }
                              onBlur={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: { ...cur, text: e.target.value || 'COPY' },
                                } as any);
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 flex-1"
                            />
                            <input
                              type="number"
                              min="8"
                              max="120"
                              defaultValue={
                                (activeTenant?.settings?.printConfig as any)?.watermark?.fontSize ||
                                48
                              }
                              onBlur={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: { ...cur, fontSize: parseInt(e.target.value) || 48 },
                                } as any);
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-16"
                              title="Ukuran font"
                            />
                            <input
                              type="number"
                              min="1"
                              max="100"
                              defaultValue={Math.round(
                                ((activeTenant?.settings?.printConfig as any)?.watermark?.opacity ||
                                  0.15) * 100
                              )}
                              onBlur={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: {
                                    ...cur,
                                    opacity: Math.min(
                                      1,
                                      Math.max(0.01, (parseInt(e.target.value) || 15) / 100)
                                    ),
                                  },
                                } as any);
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-16"
                              title="Opacity %"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              defaultValue={
                                (activeTenant?.settings?.printConfig as any)?.watermark?.color ||
                                '#d1d5db'
                              }
                              onChange={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: { ...cur, color: e.target.value },
                                } as any);
                              }}
                              className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                              title="Warna"
                            />
                            <input
                              type="number"
                              min="-180"
                              max="180"
                              defaultValue={
                                (activeTenant?.settings?.printConfig as any)?.watermark?.rotation ||
                                -45
                              }
                              onBlur={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: { ...cur, rotation: parseInt(e.target.value) || -45 },
                                } as any);
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-16"
                              title="Rotasi"
                            />
                            <select
                              defaultValue={
                                (activeTenant?.settings?.printConfig as any)?.watermark?.position ||
                                'center'
                              }
                              onChange={(e) => {
                                const cur =
                                  (activeTenant?.settings?.printConfig as any)?.watermark || {};
                                savePrinterSettings({
                                  watermark: { ...cur, position: e.target.value },
                                } as any);
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 flex-1"
                            >
                              <option value="center">Tengah</option>
                              <option value="top-left">Kiri Atas</option>
                              <option value="top-right">Kanan Atas</option>
                              <option value="bottom-left">Kiri Bawah</option>
                              <option value="bottom-right">Kanan Bawah</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Header & Footer */}
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="font-bold text-xs uppercase text-slate-800 mb-3">
                        Header & Footer
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                            Judul Header
                          </label>
                          <input
                            type="text"
                            placeholder={`Nama toko (kosongkan = "${activeTenant?.name || 'Nama Toko'}")`}
                            value={customHeaderTitle}
                            onChange={(e) =>
                              savePrinterSettings({ customHeaderTitle: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                            Catatan Kaki
                          </label>
                          <textarea
                            rows={2}
                            value={customFooterText}
                            onChange={(e) =>
                              savePrinterSettings({ customFooterText: e.target.value })
                            }
                            placeholder="Pesan penutup struk..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {configTab === 'label' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-xs uppercase text-slate-800">
                          Label Stiker Unit
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Dimensi, font, dan isi label identifikasi.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const testTicket = {
                            ticketNo: 'SVC-2026-TEST',
                            deviceName: 'iPhone 15 Pro Max',
                            deviceBrandModel: 'Apple - A3106',
                            deviceSerial: 'C39ZX899V20F',
                            customerId: '',
                            customerApprovalDate: new Date().toISOString(),
                          } as any;
                          handleDirectPrintLabel(testTicket);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase rounded-lg flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> Cetak Tes
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                          Lebar (px)
                        </label>
                        <input
                          type="number"
                          min="200"
                          max="600"
                          value={labelWidth}
                          onChange={(e) =>
                            savePrinterSettings({ labelWidth: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                          Tinggi (px)
                        </label>
                        <input
                          type="number"
                          min="100"
                          max="400"
                          value={labelHeight}
                          onChange={(e) =>
                            savePrinterSettings({ labelHeight: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                          Font
                        </label>
                        <select
                          value={labelFontSize}
                          onChange={(e) => savePrinterSettings({ labelFontSize: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold"
                        >
                          <option value="xs">Kecil</option>
                          <option value="sm">Default</option>
                          <option value="base">Sedang</option>
                          <option value="lg">Besar</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                        <span className="text-[11px] font-bold text-slate-700">QR Code</span>
                        <input
                          type="checkbox"
                          checked={labelShowQr}
                          onChange={(e) => savePrinterSettings({ labelShowQr: e.target.checked })}
                          className="w-4 h-4 rounded text-accent border-slate-300 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                        <span className="text-[11px] font-bold text-slate-700">Nama Toko</span>
                        <input
                          type="checkbox"
                          checked={labelShowLogo}
                          onChange={(e) => savePrinterSettings({ labelShowLogo: e.target.checked })}
                          className="w-4 h-4 rounded text-accent border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                        Teks Footer Label
                      </label>
                      <input
                        type="text"
                        value={labelCustomText}
                        onChange={(e) => savePrinterSettings({ labelCustomText: e.target.value })}
                        placeholder="TEMPEL DI UNIT - PINDAI UNTUK DIAGNOSA"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {configTab === 'sk' && (
                  <div className="space-y-4">
                    <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-lg">
                      {[
                        { key: 'servis', label: 'Servis' },
                        { key: 'penjualan', label: 'Penjualan' },
                        { key: 'penyewaan', label: 'Penyewaan' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setSkActiveTab(key)}
                          className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase rounded-md transition-all ${
                            skActiveTab === key
                              ? 'bg-white text-accent shadow-sm'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {skActiveTab === 'servis' && (
                      <div className="space-y-2">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                          Klausul Reparasi & Garansi
                        </label>
                        <textarea
                          rows={6}
                          value={termsAndConditionsText}
                          onChange={(e) =>
                            savePrinterSettings({ termsAndConditionsText: e.target.value })
                          }
                          placeholder="Masukkan poin-poin syarat servis..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed"
                        />
                        <p className="text-[9px] text-slate-400 italic">
                          Diterapkan pada Nota Servis dan Portal Lacak.
                        </p>
                      </div>
                    )}
                    {skActiveTab === 'penjualan' && (
                      <div className="space-y-2">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                          Klausul Penjualan
                        </label>
                        <textarea
                          rows={6}
                          value={termsSalesText}
                          onChange={(e) => savePrinterSettings({ termsSalesText: e.target.value })}
                          placeholder="Masukkan poin-poin syarat penjualan..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed"
                        />
                        <p className="text-[9px] text-slate-400 italic">
                          Diterapkan pada Struk POS.
                        </p>
                      </div>
                    )}
                    {skActiveTab === 'penyewaan' && (
                      <div className="space-y-2">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold">
                          Klausul Penyewaan
                        </label>
                        <textarea
                          rows={6}
                          value={termsRentalText}
                          onChange={(e) => savePrinterSettings({ termsRentalText: e.target.value })}
                          placeholder="Masukkan poin-poin aturan penyewaan..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed"
                        />
                        <p className="text-[9px] text-slate-400 italic">
                          Diterapkan pada Dokumen Sewa.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (
                          await showConfirm({
                            title: 'Reset S&K',
                            message: 'Reset ke nilai default?',
                            confirmLabel: 'Reset',
                            type: 'warning',
                          })
                        ) {
                          savePrinterSettings({
                            termsAndConditionsText:
                              '1. Garansi berlaku selama 30 hari hanya untuk komponen yang diganti.\n2. Kerusakan akibat cairan, benturan, atau modifikasi software mandiri membatalkan garansi.\n3. Barang yang tidak diambil dalam waktu 90 hari di luar tanggung jawab toko.\n4. Biaya pembatalan setelah pembongkaran dikenakan Rp 50.000,- untuk biaya analisa teknisi.',
                            termsSalesText:
                              '1. Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.\n2. Komplain kekurangan item wajib menyertakan video unboxing utuh.\n3. Aksesoris dan item promo tidak dilindungi oleh garansi toko.\n4. Pembayaran wajib lunas sebelum barang diserahterimakan.',
                            termsRentalText:
                              '1. Penyewa wajib menyerahkan kartu identitas asli sebagai jaminan.\n2. Keterlambatan pengembalian dikenakan denda Rp 25.000,- per jam.\n3. Kerusakan fisik pada unit sewa sepenuhnya ditanggung oleh penyewa.\n4. Pembatalan sewa kurang dari 24 jam dikenakan biaya administrasi 50%.',
                          });
                        }
                      }}
                      className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 bg-white rounded-xl text-[10px] font-bold"
                    >
                      Reset Default
                    </button>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                <button
                  onClick={() =>
                    void savePrinterSettings({
                      paperSize,
                      printMode,
                      printerName,
                      printFontSize,
                      printMargin,
                      printQrCode,
                      printHeaderLogo,
                      printCustomerNotes,
                      printTermsAndConditions,
                      showTermsInTracking,
                      labelWidth,
                      labelHeight,
                      labelFontSize,
                      labelShowQr,
                      labelShowLogo,
                      labelCustomText,
                      customHeaderTitle,
                      customFooterText,
                      termsAndConditionsText,
                      termsSalesText,
                      termsRentalText,
                      thermalCompact,
                      multiPrinterMap,
                      printTemplates,
                    })
                  }
                  className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                >
                  <Save className="w-3 h-3 inline mr-1" /> Simpan Konfigurasi
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Preview Column */}
          <div className="xl:col-span-6 space-y-4">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
              <div className="w-full flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
                <div>
                  <span className="text-[9px] font-mono text-indigo-400 bg-indigo-900/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Pratinjau Langsung
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-100 tracking-tight mt-1">
                    Pratinjau Cetak Fisik
                  </h3>
                </div>
                <div className="flex border border-slate-700 bg-slate-800/80 p-0.5 rounded-lg text-[9px] font-bold uppercase">
                  <button
                    onClick={() => setPrintPreviewType('nota')}
                    className={`px-2.5 py-1 rounded transition-all ${printPreviewType === 'nota' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Nota Struk
                  </button>
                  <button
                    onClick={() => setPrintPreviewType('label')}
                    className={`px-2.5 py-1 rounded transition-all ${printPreviewType === 'label' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Label Stiker
                  </button>
                </div>
              </div>
              {printPreviewType === 'nota' ? (
                <div className="w-full overflow-auto rounded-lg bg-slate-700 p-3 shadow-2xl animate-fadeIn">
                  <iframe
                    title="Pratinjau Nota"
                    srcDoc={previewDocument}
                    className="block origin-top-left border-0 bg-white"
                    style={{
                      width: `${previewWidth}px`,
                      height: '620px',
                      transform: 'scale(0.9)',
                      marginBottom: '-62px',
                    }}
                  />
                </div>
              ) : (
                <div
                  className="bg-white text-slate-900 rounded-lg p-4 shadow-2xl border-2 border-slate-950 flex flex-col justify-between relative overflow-hidden transition-all duration-300 animate-fadeIn"
                  style={{
                    width: `${labelWidth}px`,
                    height: `${labelHeight}px`,
                    maxHeight: '350px',
                  }}
                >
                  <div className="flex justify-between items-center border-b border-slate-950 pb-1.5">
                    <span
                      className="font-extrabold text-[9px] text-slate-900 uppercase tracking-tight"
                      style={{ display: labelShowLogo ? 'block' : 'none' }}
                    >
                      {customHeaderTitle.trim() || activeTenant?.name || 'NAMA TOKO'}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold bg-slate-950 text-white px-1.5 py-0.5 rounded">
                      #SVC-TEST-LABEL
                    </span>
                  </div>
                  <div className="flex gap-2 items-center my-1.5 flex-1 min-height-0">
                    {labelShowQr && (
                      <div className="w-14 h-14 border border-slate-900 p-1 bg-white shrink-0 flex items-center justify-center">
                        <div className="grid grid-cols-3 gap-0.5 w-full h-full opacity-90">
                          {[...Array(9)].map((_, i) => (
                            <div
                              key={i}
                              className={`rounded-sm ${i % 2 === 0 ? 'bg-slate-950' : 'bg-transparent'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div
                      className="text-slate-800 leading-tight space-y-0.5 truncate"
                      style={{
                        fontSize:
                          labelFontSize === 'xs'
                            ? '8px'
                            : labelFontSize === 'lg'
                              ? '13px'
                              : labelFontSize === 'base'
                                ? '11px'
                                : '9.5px',
                      }}
                    >
                      <div>
                        <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                          Perangkat
                        </strong>{' '}
                        <span className="font-bold text-slate-900">iPhone 15 Pro Max</span>
                      </div>
                      <div>
                        <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                          Model
                        </strong>{' '}
                        <span className="font-semibold text-slate-800">Apple - A3106</span>
                      </div>
                      <div>
                        <strong className="font-extrabold font-mono text-[8px] uppercase text-slate-400 block leading-none">
                          Pelanggan
                        </strong>{' '}
                        <span className="font-bold text-slate-800">Budi Santoso</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-950 pt-1 text-center font-bold uppercase tracking-wide text-slate-900 text-[7px] truncate font-mono">
                    {labelCustomText}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-4 leading-relaxed text-center max-w-sm">
                Gunakan tombol <strong className="text-slate-300">"Nota QR"</strong> atau{' '}
                <strong className="text-slate-300">"Label QR"</strong> pada tabel tiket untuk
                langsung mencetak nota fisik.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
