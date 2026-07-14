import { useState, useEffect, useRef } from "react";
import {
  normalizeIndonesianPhone,
  validateServiceReceptionForm,
  isValidIndonesianPhone,
} from "../utils/serviceReceptionUtils";
import { CATEGORY_CONFIGS } from "../config/categoryConfigs";

interface UseServiceReceptionDeps {
  customers: any[];
  activeTenantId: string | undefined;
  currentTenantId: string | undefined;
  currentBranchId: string | undefined;
  tenantObj: any;
  addServiceTicket: (t: any) => Promise<any>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  showNewSrvCustForm: boolean;
  setShowNewSrvCustForm: (v: boolean) => void;
  setReceptionErrors: (v: string[]) => void;
  setIsSubmittingReception: (v: boolean) => void;
  setJustCreatedTicket: (v: any) => void;
  setPreviewReceptionTicket: (v: any) => void;
  setActiveSubTab: (sub: string) => void;
  setAutoAssignReason: (v: string | null) => void;
}

// Semua state + handler form Penerimaan Unit Servis.
// Diekstrak dari ServicesTab.tsx agar god-component mengecil.
// Nama state sengaja dipertahankan (newSrv*) supaya form JSX di parent
// tidak perlu diubah — parent cukup destructure hasil hook ini.
export function useServiceReception(deps: UseServiceReceptionDeps) {
  const {
    customers,
    activeTenantId,
    currentTenantId,
    currentBranchId,
    tenantObj,
    addServiceTicket,
    showToast,
    showNewSrvCustForm,
    setShowNewSrvCustForm,
    setReceptionErrors,
    setIsSubmittingReception,
    setJustCreatedTicket,
    setPreviewReceptionTicket,
    setActiveSubTab,
    setAutoAssignReason,
  } = deps;

  const [newSrvCustName, setNewSrvCustName] = useState<string>("");
  const [newSrvCustPhone, setNewSrvCustPhone] = useState<string>("");
  const [newSrvCustEmail, setNewSrvCustEmail] = useState<string>("");
  const [newSrvCustAddress, setNewSrvCustAddress] = useState<string>("");
  const [newSrvCustomer, setNewSrvCustomer] = useState<string>("");
  const [newSrvEstCompletion, setNewSrvEstCompletion] = useState<string>("");
  const [newSrvDevice, setNewSrvDevice] = useState<string>("");
  const [newSrvBrand, setNewSrvBrand] = useState<string>("");
  const [newSrvSerial, setNewSrvSerial] = useState<string>("");
  const [newSrvWarranty, setNewSrvWarranty] = useState<number>(3);
  const [newSrvDownPayment, setNewSrvDownPayment] = useState<string>("0");
  const [newSrvIsCheckOnly, setNewSrvIsCheckOnly] = useState<boolean>(false);
  const [newSrvPhysicalCondition, setNewSrvPhysicalCondition] =
    useState<string>("Mulus / Normal Wear");
  const [newSrvScreenLock, setNewSrvScreenLock] = useState<string>("");
  const [newSrvComplaint, setNewSrvComplaint] = useState<string>("");
  const [newSrvCategory, setNewSrvCategory] = useState<string>("Smartphone");
  const [newSrvDynamicSpecs, setNewSrvDynamicSpecs] = useState<Record<
    string,
    any
  >>({});
  const [newSrvChecklist, setNewSrvChecklist] = useState<Record<string, boolean>>(
    {},
  );

  // init checklist berdasarkan kategori (sama seperti di parent dulu)
  useEffect(() => {
    const config =
      CATEGORY_CONFIGS[newSrvCategory] || CATEGORY_CONFIGS.Other || { checklist: [] };
    const initial: Record<string, boolean> = {};
    config.checklist.forEach((item: string) => {
      initial[item] = false;
    });
    setNewSrvChecklist(initial);
  }, [newSrvCategory]);
  const [newSrvAccessories, setNewSrvAccessories] = useState<string[]>([]);
  const [newSrvCustomAccessories, setNewSrvCustomAccessories] =
    useState<string>("");
  const [newSrvStorageLocId, setNewSrvStorageLocId] = useState<string>("");
  const [newSrvCapturedConditions, setNewSrvCapturedConditions] = useState<
    any[]
  >([]);
  const [newSrvIsOutsourced, setNewSrvIsOutsourced] = useState<boolean>(false);
  const [newSrvOutsourcedVendor, setNewSrvOutsourcedVendor] =
    useState<string>("");
  const [newSrvOutsourcingCost, setNewSrvOutsourcingCost] =
    useState<string>("");
  const [newSrvTechId, setNewSrvTechId] = useState<string>("");

  const [custQuery, setCustQuery] = useState<string>("");

  const receptionFormRef = useRef<HTMLFormElement | null>(null);

  // === AUTO-SAVE DRAFT FORM PENERIMAAN (persist saat pindah tab) ===
  const SRV_DRAFT = "fixdev_srv_draft_v1";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SRV_DRAFT);
      if (!raw) return;
      const d = JSON.parse(raw);
      setShowNewSrvCustForm(d.showNewSrvCustForm ?? false);
      setNewSrvCustName(d.newSrvCustName ?? "");
      setNewSrvCustPhone(d.newSrvCustPhone ?? "");
      setNewSrvCustEmail(d.newSrvCustEmail ?? "");
      setNewSrvCustAddress(d.newSrvCustAddress ?? "");
      setNewSrvCustomer(d.newSrvCustomer ?? "");
      setNewSrvEstCompletion(d.newSrvEstCompletion ?? "");
      setNewSrvDevice(d.newSrvDevice ?? "");
      setNewSrvBrand(d.newSrvBrand ?? "");
      setNewSrvSerial(d.newSrvSerial ?? "");
      setNewSrvWarranty(d.newSrvWarranty ?? 3);
      setNewSrvDownPayment(d.newSrvDownPayment ?? "0");
      setNewSrvIsCheckOnly(d.newSrvIsCheckOnly ?? false);
      setNewSrvPhysicalCondition(
        d.newSrvPhysicalCondition ?? "Mulus / Normal Wear",
      );
      setNewSrvScreenLock(d.newSrvScreenLock ?? "");
      setNewSrvComplaint(d.newSrvComplaint ?? "");
      setNewSrvCategory(d.newSrvCategory ?? "Smartphone");
      setNewSrvDynamicSpecs(d.newSrvDynamicSpecs ?? {});
      setNewSrvAccessories(d.newSrvAccessories ?? []);
      setNewSrvCustomAccessories(d.newSrvCustomAccessories ?? "");
      setNewSrvStorageLocId(d.newSrvStorageLocId ?? "");
      setNewSrvCapturedConditions(d.newSrvCapturedConditions ?? []);
      setNewSrvIsOutsourced(d.newSrvIsOutsourced ?? false);
      setNewSrvOutsourcedVendor(d.newSrvOutsourcedVendor ?? "");
      setNewSrvOutsourcingCost(d.newSrvOutsourcingCost ?? "");
      setNewSrvTechId(d.newSrvTechId ?? "");
      setNewSrvChecklist(d.newSrvChecklist ?? {});
      setCustQuery(d.custQuery ?? "");
    } catch {
      /* abaikan draft rusak */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = {
      showNewSrvCustForm,
      newSrvCustName,
      newSrvCustPhone,
      newSrvCustEmail,
      newSrvCustAddress,
      newSrvCustomer,
      newSrvEstCompletion,
      newSrvDevice,
      newSrvBrand,
      newSrvSerial,
      newSrvWarranty,
      newSrvDownPayment,
      newSrvIsCheckOnly,
      newSrvPhysicalCondition,
      newSrvScreenLock,
      newSrvComplaint,
      newSrvCategory,
      newSrvDynamicSpecs,
      newSrvAccessories,
      newSrvCustomAccessories,
      newSrvStorageLocId,
      newSrvCapturedConditions,
      newSrvIsOutsourced,
      newSrvOutsourcedVendor,
      newSrvOutsourcingCost,
      newSrvTechId,
      newSrvChecklist,
      custQuery,
    };
    try {
      localStorage.setItem(SRV_DRAFT, JSON.stringify(d));
    } catch {
      /* abaikan */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showNewSrvCustForm,
    newSrvCustName,
    newSrvCustPhone,
    newSrvCustEmail,
    newSrvCustAddress,
    newSrvCustomer,
    newSrvEstCompletion,
    newSrvDevice,
    newSrvBrand,
    newSrvSerial,
    newSrvWarranty,
    newSrvDownPayment,
    newSrvIsCheckOnly,
    newSrvPhysicalCondition,
    newSrvScreenLock,
    newSrvComplaint,
    newSrvCategory,
    newSrvDynamicSpecs,
    newSrvAccessories,
    newSrvCustomAccessories,
    newSrvStorageLocId,
    newSrvCapturedConditions,
    newSrvIsOutsourced,
    newSrvOutsourcedVendor,
    newSrvOutsourcingCost,
    newSrvTechId,
    newSrvChecklist,
  ]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomerName = newSrvCustName.trim();
    const newCustomerPhone = normalizeIndonesianPhone(newSrvCustPhone);
    const errors = validateServiceReceptionForm({
      customerId: newSrvCustomer || undefined,
      customerName: newCustomerName,
      customerPhone: newCustomerPhone,
      deviceName: newSrvDevice,
      complaint: newSrvComplaint,
      isOutsourced: newSrvIsOutsourced,
      outsourcedVendor: newSrvOutsourcedVendor,
      outsourcingCost: newSrvOutsourcingCost,
    });

    setReceptionErrors(errors);
    if (errors.length > 0) {
      showToast("Harap lengkapi data wajib sebelum mendaftarkan unit.", "error");
      requestAnimationFrame(() => {
        receptionFormRef.current
          ?.querySelector<HTMLElement>("[data-reception-error='true']")
          ?.focus();
        receptionFormRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    let customerId = newSrvCustomer;
    let customerData: any = undefined;
    if (!customerId) {
      const duplicateCustomer = customers.find(
        (customer) =>
          customer.tenantId === activeTenantId &&
          normalizeIndonesianPhone(customer.phone || "") === newCustomerPhone,
      );

      if (duplicateCustomer) {
        customerId = duplicateCustomer.id;
        setNewSrvCustomer(duplicateCustomer.id);
        showToast(
          `Nomor WhatsApp sudah terdaftar atas nama ${duplicateCustomer.name}. Tiket ditautkan ke pelanggan tersebut.`,
          "info",
        );
      } else {
        customerData = {
          name: newCustomerName,
          phone: newCustomerPhone,
          email: newSrvCustEmail.trim(),
          address: newSrvCustAddress.trim(),
        };
        customerId = "pending-server-customer";
      }
    }

    if (!customerId) {
      showToast("Pilih pelanggan atau buat pelanggan baru!", "error");
      return;
    }

    if (Number(newSrvDownPayment) < 0 || Number(newSrvOutsourcingCost) < 0) {
      showToast("Nominal biaya tidak boleh negatif.", "error");
      return;
    }

    if (!newSrvDevice) {
      showToast("Model unit wajib diisi!", "error");
      return;
    }

    setIsSubmittingReception(true);
    const ticketId = `TKT-${Date.now()}`;
    const newTicket: any = {
      tenantId: currentTenantId,
      branchId: currentBranchId || "HQ",
      customerId: customerId,
      deviceName: newSrvDevice,
      deviceSerial: newSrvSerial,
      deviceBrandModel: `${newSrvBrand} ${newSrvDevice}`,
      initialChecklist: Object.entries(newSrvChecklist).map(([name, checked]) => ({
        name,
        checked: !!checked,
      })),
      initialPhotos: [],
      customerComplaints: newSrvComplaint,
      estimatedCost: newSrvIsCheckOnly
        ? (tenantObj?.settings?.serviceSettings?.defaultDiagnosisFee ?? 0)
        : 0,
      customerApprovalStatus: "PENDING",
      assignedTechId: newSrvTechId || undefined,
      partsUsed: [],
      warrantyMonths:
        newSrvWarranty || Math.round((tenantObj?.settings?.warrantyDays ?? 90) / 30),
      isOutsourced: newSrvIsOutsourced,
      outsourcedVendorId: newSrvOutsourcedVendor,
      outsourcingCost: Number(newSrvOutsourcingCost) || 0,
      downPayment: Number(newSrvDownPayment) || 0,
      isCheckOnly: newSrvIsCheckOnly,
      deviceCategory: newSrvCategory,
      accessoriesLeft: newSrvAccessories,
      customAccessories: newSrvCustomAccessories,
      physicalCondition: newSrvPhysicalCondition,
      screenLockPin: newSrvScreenLock,
      estimatedCompletionDate: newSrvEstCompletion,
      capturedConditions: newSrvCapturedConditions,
      dynamicFields:
        Object.keys(newSrvDynamicSpecs).length > 0 ? newSrvDynamicSpecs : undefined,
      storageLocationId: newSrvStorageLocId || undefined,
      customerData,
    };

    try {
      const createdTicket = await addServiceTicket(newTicket);
      setJustCreatedTicket(createdTicket);
      setPreviewReceptionTicket(createdTicket);
      setReceptionErrors([]);
      setNewSrvCustomer("");
      setShowNewSrvCustForm(false);
      setNewSrvCustName("");
      setNewSrvCustPhone("");
      setNewSrvCustEmail("");
      setNewSrvCustAddress("");
      setNewSrvEstCompletion("");
      setNewSrvDevice("");
      setNewSrvBrand("");
      setNewSrvSerial("");
      setNewSrvWarranty(3);
      setNewSrvDownPayment("0");
      setNewSrvIsCheckOnly(false);
      setNewSrvPhysicalCondition("Mulus / Normal Wear");
      setNewSrvScreenLock("");
      setNewSrvComplaint("");
      setNewSrvCategory("Smartphone");
      setNewSrvDynamicSpecs({});
      setNewSrvAccessories([]);
      setNewSrvCustomAccessories("");
      setNewSrvStorageLocId("");
      setNewSrvCapturedConditions([]);
      setNewSrvIsOutsourced(false);
      setNewSrvOutsourcedVendor("");
      setNewSrvOutsourcingCost("");
      setNewSrvTechId("");
      setAutoAssignReason(null);
      try {
        localStorage.removeItem(SRV_DRAFT);
      } catch {}
      showToast("Penerimaan Unit Servis berhasil didaftarkan!", "success");
      setActiveSubTab("list");
    } catch (error: any) {
      const message = error?.message || "Gagal menyimpan penerimaan unit ke server.";
      setReceptionErrors([message]);
      showToast(message, "error");
    } finally {
      setIsSubmittingReception(false);
    }
  };

  return {
    // state
    newSrvCustName,
    newSrvCustPhone,
    newSrvCustEmail,
    newSrvCustAddress,
    newSrvCustomer,
    newSrvEstCompletion,
    newSrvDevice,
    newSrvBrand,
    newSrvSerial,
    newSrvWarranty,
    newSrvDownPayment,
    newSrvIsCheckOnly,
    newSrvPhysicalCondition,
    newSrvScreenLock,
    newSrvComplaint,
    newSrvCategory,
    newSrvDynamicSpecs,
    newSrvChecklist,
    newSrvAccessories,
    newSrvCustomAccessories,
    newSrvStorageLocId,
    newSrvCapturedConditions,
    newSrvIsOutsourced,
    newSrvOutsourcedVendor,
    newSrvOutsourcingCost,
    newSrvTechId,
    custQuery,
    receptionFormRef,
    // setters
    setNewSrvCustName,
    setNewSrvCustPhone,
    setNewSrvCustEmail,
    setNewSrvCustAddress,
    setNewSrvCustomer,
    setNewSrvEstCompletion,
    setNewSrvDevice,
    setNewSrvBrand,
    setNewSrvSerial,
    setNewSrvWarranty,
    setNewSrvDownPayment,
    setNewSrvIsCheckOnly,
    setNewSrvPhysicalCondition,
    setNewSrvScreenLock,
    setNewSrvComplaint,
    setNewSrvCategory,
    setNewSrvDynamicSpecs,
    setNewSrvChecklist,
    setNewSrvAccessories,
    setNewSrvCustomAccessories,
    setNewSrvStorageLocId,
    setNewSrvCapturedConditions,
    setNewSrvIsOutsourced,
    setNewSrvOutsourcedVendor,
    setNewSrvOutsourcingCost,
    setNewSrvTechId,
    setCustQuery,
    // handler
    handleCreateService,
  };
}
