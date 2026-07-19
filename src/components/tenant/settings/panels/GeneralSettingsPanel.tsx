import React from "react";
import {
  Barcode,
  Check,
  FileText,
  Printer,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useSaaS } from "../../../../context/SaaSContext";
import { useToast } from "../../../ui/Toast";
import { useConfirm } from "../../../ui/ConfirmDialog";

interface GeneralSettingsPanelProps {
  currentTenantId: string;
}

export const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = ({
  currentTenantId,
}) => {
  const { tenants, updateTenant } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const tenantObj = tenants.find((t: any) => t.id === currentTenantId);
  const activeTenant = tenantObj;

  const [paperSize, setPaperSize] = React.useState(
    tenantObj?.settings?.printConfig?.paperSize || "thermal_80",
  );
  const [labelWidth, setLabelWidth] = React.useState(
    tenantObj?.settings?.printConfig?.labelWidth ?? 58,
  );
  const [labelHeight, setLabelHeight] = React.useState(
    tenantObj?.settings?.printConfig?.labelHeight ?? 40,
  );
  const [labelFontSize, setLabelFontSize] = React.useState<string>(
    tenantObj?.settings?.printConfig?.labelFontSize || "sm",
  );
  const [labelShowQr, setLabelShowQr] = React.useState(
    tenantObj?.settings?.printConfig?.labelShowQr ?? true,
  );
  const [labelShowLogo, setLabelShowLogo] = React.useState(
    tenantObj?.settings?.printConfig?.labelShowLogo ?? true,
  );
  const [labelCustomText, setLabelCustomText] = React.useState(
    tenantObj?.settings?.printConfig?.labelCustomText || "",
  );
  const [customHeaderTitle, setCustomHeaderTitle] = React.useState(
    tenantObj?.settings?.printConfig?.customHeaderTitle || "",
  );
  const [customFooterText, setCustomFooterText] = React.useState(
    tenantObj?.settings?.printConfig?.customFooterText || "",
  );
  const [printFontSize, setPrintFontSize] = React.useState(
    tenantObj?.settings?.printConfig?.printFontSize || "normal",
  );
  const [printMargin, setPrintMargin] = React.useState<number>(
    tenantObj?.settings?.printConfig?.printMargin ?? 12,
  );
  const [printHeaderLogo, setPrintHeaderLogo] = React.useState(
    tenantObj?.settings?.printConfig?.printHeaderLogo ?? true,
  );
  const [printQrCode, setPrintQrCode] = React.useState(
    tenantObj?.settings?.printConfig?.printQrCode ?? true,
  );
  const [printCustomerNotes, setPrintCustomerNotes] = React.useState(
    tenantObj?.settings?.printConfig?.printCustomerNotes ?? true,
  );
  const [printTermsAndConditions, setPrintTermsAndConditions] = React.useState(
    tenantObj?.settings?.printConfig?.printTermsAndConditions ?? true,
  );
  const [showTermsInTracking, setShowTermsInTracking] = React.useState(
    tenantObj?.settings?.printConfig?.showTermsInTracking ?? true,
  );
  const [printPreviewType, setPrintPreviewType] = React.useState<"nota" | "label">(
    "nota",
  );
  const [termsSalesText, setTermsSalesText] = React.useState(
    tenantObj?.settings?.printConfig?.termsSalesText || "",
  );
  const [termsRentalText, setTermsRentalText] = React.useState(
    tenantObj?.settings?.printConfig?.termsRentalText || "",
  );
  const [termsAndConditionsText, setTermsAndConditionsText] = React.useState(
    tenantObj?.settings?.printConfig?.termsAndConditionsText || "",
  );
  const [skActiveTab, setSkActiveTab] = React.useState("servis");

  const handleDirectPrintLabel = (_ticket: any) => {};

  const savePrinterSettings = async (options?: any) => {
    if (!options) return;
    const current = tenantObj?.settings?.printConfig || {};
    const updated: Record<string, any> = { ...current };

    if (options.paperSize !== undefined) {
      setPaperSize(options.paperSize);
      updated.paperSize = options.paperSize;
    }
    if (options.printQrCode !== undefined) {
      setPrintQrCode(options.printQrCode);
      updated.printQrCode = options.printQrCode;
    }
    if (options.printHeaderLogo !== undefined) {
      setPrintHeaderLogo(options.printHeaderLogo);
      updated.printHeaderLogo = options.printHeaderLogo;
    }
    if (options.printCustomerNotes !== undefined) {
      setPrintCustomerNotes(options.printCustomerNotes);
      updated.printCustomerNotes = options.printCustomerNotes;
    }
    if (options.printTermsAndConditions !== undefined) {
      setPrintTermsAndConditions(options.printTermsAndConditions);
      updated.printTermsAndConditions = options.printTermsAndConditions;
    }
    if (options.showTermsInTracking !== undefined) {
      setShowTermsInTracking(options.showTermsInTracking);
      updated.showTermsInTracking = options.showTermsInTracking;
    }
    if (options.printFontSize !== undefined) {
      setPrintFontSize(options.printFontSize);
      updated.printFontSize = options.printFontSize;
    }
    if (options.printMargin !== undefined) {
      setPrintMargin(options.printMargin);
      updated.printMargin = options.printMargin;
    }
    if (options.customHeaderTitle !== undefined) {
      setCustomHeaderTitle(options.customHeaderTitle);
      updated.customHeaderTitle = options.customHeaderTitle;
    }
    if (options.customFooterText !== undefined) {
      setCustomFooterText(options.customFooterText);
      updated.customFooterText = options.customFooterText;
    }
    if (options.termsAndConditionsText !== undefined) {
      setTermsAndConditionsText(options.termsAndConditionsText);
      updated.termsAndConditionsText = options.termsAndConditionsText;
    }
    if (options.labelWidth !== undefined) {
      setLabelWidth(options.labelWidth);
      updated.labelWidth = options.labelWidth;
    }
    if (options.labelHeight !== undefined) {
      setLabelHeight(options.labelHeight);
      updated.labelHeight = options.labelHeight;
    }
    if (options.labelFontSize !== undefined) {
      setLabelFontSize(options.labelFontSize);
      updated.labelFontSize = options.labelFontSize;
    }
    if (options.labelShowQr !== undefined) {
      setLabelShowQr(options.labelShowQr);
      updated.labelShowQr = options.labelShowQr;
    }
    if (options.labelShowLogo !== undefined) {
      setLabelShowLogo(options.labelShowLogo);
      updated.labelShowLogo = options.labelShowLogo;
    }
    if (options.labelCustomText !== undefined) {
      setLabelCustomText(options.labelCustomText);
      updated.labelCustomText = options.labelCustomText;
    }
    if (options.termsSalesText !== undefined) {
      setTermsSalesText(options.termsSalesText);
      updated.termsSalesText = options.termsSalesText;
    }
    if (options.termsRentalText !== undefined) {
      setTermsRentalText(options.termsRentalText);
      updated.termsRentalText = options.termsRentalText;
    }

    try {
      await updateTenant(currentTenantId, {
        settings: {
          ...(tenantObj?.settings || {}),
          printConfig: updated,
        },
      });
      showToast("Pengaturan cetak berhasil disimpan!", "success");
    } catch (error: any) {
      showToast(error?.message || "Pengaturan cetak gagal disimpan.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
      <div className="xl:col-span-6 space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-emerald-500 text-white rounded-md">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Sinkronisasi Printer & Label Aktif</p>
              <p className="text-[10px] text-emerald-600">
                Seluruh pengaturan ini akan diterapkan otomatis pada tindakan cetak langsung (Nota QR & Label QR) di tabel tiket.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
            Ready
          </span>
        </div>
      </div>
      <div className="xl:col-span-6 space-y-4" />
    </div>
  );
};
