/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { useSaaS } from "../context/SaaSContext";
import {
  Code,
  Terminal,
  Key,
  Copy,
  Check,
  Lock,
  PlusCircle,
  Trash2,
  Play,
  BookOpen,
  Globe,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Database,
  ArrowRightLeft,
} from "lucide-react";

interface Token {
  id: string;
  token: string;
  name: string;
  abilities: string[];
  createdAt: string;
  lastUsedAt?: string;
  tenantId: string;
  branchId: string;
}

export function DeveloperApiManager() {
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const { apiFetch } = useSaaS();
  const [activeTab, setActiveTab] = useState<"tokens" | "docs" | "playground">(
    "tokens",
  );

  // Tokens state
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // New token form state
  const [tokenName, setTokenName] = useState("");
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>(["*"]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedTokenName, setGeneratedTokenName] = useState("");
  const [showTokenValue, setShowTokenValue] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);

  // Playground state
  const [selectedToken, setSelectedToken] = useState<string>(
    "km_sanctum_token_owner",
  );
  const [playgroundEndpoint, setPlaygroundEndpoint] =
    useState<string>("customers");
  const [playgroundMethod, setPlaygroundMethod] = useState<
    "GET" | "POST" | "PUT" | "DELETE"
  >("GET");
  const [playgroundPathParams, setPlaygroundPathParams] = useState<string>("");
  const [playgroundQueryParams, setPlaygroundQueryParams] =
    useState<string>("");
  const [playgroundBody, setPlaygroundBody] = useState<string>(
    JSON.stringify(
      {
        name: "Budi Santoso",
        email: "budi.santoso@gmail.com",
        phone: "081234567890",
        address: "Jl. Sudirman No. 45, Makassar",
        segment: "PERSONAL",
        notes: "Minta diperiksa berkala",
      },
      null,
      2,
    ),
  );
  const [executingCall, setExecutingCall] = useState(false);
  const [apiResponse, setApiResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
  } | null>(null);

  // Documentation Selected Endpoint
  const [selectedDocId, setSelectedDocId] = useState<string>("get_customers");

  // Load active tokens
  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      // Use the master seeded token to access token list administrative API
      const res = await apiFetch("/api/v1/auth/tokens", {
        headers: { Authorization: "Bearer km_sanctum_token_owner" },
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
      } else {
        console.error("Gagal mengambil data tokens");
      }
    } catch (err) {
      console.error("Error fetching tokens:", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  // Handle Token Creation
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      showToast("Nama token wajib diisi!", "error");
      return;
    }

    try {
      // Send creation request
      const res = await fetch("/api/v1/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "owner@example.com", // Seed tenant owner credential
          tokenName: tokenName.trim(),
          abilities: selectedAbilities,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.token);
        setGeneratedTokenName(data.name);
        setTokenName("");
        setSelectedAbilities(["*"]);
        fetchTokens(); // Refresh list
      } else {
        const errorData = await res.json();
        showToast(
          `Gagal membuat token: ${errorData.error || errorData.message}`,
          "error",
        );
      }
    } catch (err) {
      console.error("Error creating token:", err);
      showToast("Terjadi kesalahan jaringan.", "error");
    }
  };

  // Handle Token Revocation
  const handleRevokeToken = async (tokenId: string, tokenName: string) => {
    if (
      !(await showConfirm({
        title: "Cabut Akses Token",
        message: `Apakah Anda yakin ingin mencabut (delete) token '${tokenName}'? Aplikasi eksternal yang memakai token ini tidak akan bisa mengakses API lagi.`,
        confirmLabel: "Cabut Token",
        type: "danger",
      }))
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/auth/tokens/${tokenId}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer km_sanctum_token_owner",
        },
      });

      if (res.ok) {
        fetchTokens(); // Refresh list
      } else {
        showToast("Gagal mencabut token.", "error");
      }
    } catch (err) {
      console.error("Error revoking token:", err);
    }
  };

  // Copy to Clipboard helper
  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Execute playground API call
  const handleExecutePlayground = async () => {
    setExecutingCall(true);
    setApiResponse(null);

    const safeEndpoint = playgroundEndpoint.replace(/^\/+|\.\./g, "");
    let url = `/api/v1/${safeEndpoint}`;
    if (playgroundPathParams.trim()) {
      const safePath = playgroundPathParams
        .trim()
        .split("/")
        .filter(Boolean)
        .map(encodeURIComponent)
        .join("/");
      url += `/${safePath}`;
    }
    if (playgroundQueryParams.trim()) {
      const params = new URLSearchParams(playgroundQueryParams.trim());
      url += `?${params.toString()}`;
    }

    const options: RequestInit = {
      method: playgroundMethod,
      headers: {
        Authorization: `Bearer ${selectedToken.trim()}`,
      },
    };

    if (["POST", "PUT"].includes(playgroundMethod)) {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };
      try {
        // Validate JSON before sending
        JSON.parse(playgroundBody);
        options.body = playgroundBody;
      } catch (err) {
        showToast(
          "Kesalahan: Isian request body harus berupa format JSON yang valid!",
          "error",
        );
        setExecutingCall(false);
        return;
      }
    }

    try {
      const startTime = performance.now();
      const response = await fetch(url, options);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      let bodyData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        bodyData = await response.json();
      } else {
        bodyData = await response.text();
      }

      // Convert headers to record
      const headersRecord: Record<string, string> = {
        "content-type": response.headers.get("content-type") || "",
        "latency-ms": `${latency}ms`,
        server: "Express + Node Container",
      };

      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        headers: headersRecord,
        body: bodyData,
      });
    } catch (err: any) {
      setApiResponse({
        status: 500,
        statusText: "Internal Connection Error",
        headers: { error: "Fetch failure" },
        body: {
          error: err.message,
          message: "Gagal melakukan request HTTP ke server.",
        },
      });
    } finally {
      setExecutingCall(false);
    }
  };

  // API Endpoints list for documentation
  const endpoints = [
    {
      id: "create_token",
      section: "Authentication",
      method: "POST",
      path: "/auth/token",
      desc: "Buat personal access token baru menggunakan email pemilik / staff bisnis yang terdaftar.",
      scopes: ["None (Public Exchange)"],
      sampleBody: {
        email: "owner@example.com",
        tokenName: "Aplikasi Mobile POS",
        abilities: ["*"],
      },
    },
    {
      id: "get_customers",
      section: "Customers",
      method: "GET",
      path: "/customers",
      desc: "Ambil daftar seluruh data pelanggan bisnis yang tersimpan pada tenant aktif.",
      scopes: ["customers:read", "*"],
      queryParams: "search=budi&segment=PERSONAL",
    },
    {
      id: "get_customer_by_id",
      section: "Customers",
      method: "GET",
      path: "/customers/{id}",
      desc: "Ambil detail data pelanggan tertentu secara spesifik berdasarkan ID unik.",
      scopes: ["customers:read", "*"],
      pathParams: "cust-xxxx",
    },
    {
      id: "create_customer",
      section: "Customers",
      method: "POST",
      path: "/customers",
      desc: "Tambahkan data pelanggan baru ke sistem CRM.",
      scopes: ["customers:write", "*"],
      sampleBody: {
        name: "Melati Indah",
        email: "melati@gmail.com",
        phone: "08987654321",
        address: "Perum Graha Indah Blok C/10",
        segment: "PERSONAL",
        companyName: null,
        notes: "Pelanggan VIP reparasi laptop",
      },
    },
    {
      id: "update_customer",
      section: "Customers",
      method: "PUT",
      path: "/customers/{id}",
      desc: "Perbarui detail isian data pelanggan berdasarkan ID unik.",
      scopes: ["customers:write", "*"],
      pathParams: "cust-xxxx",
      sampleBody: {
        email: "melati.baru@gmail.com",
        notes: "Minta dihubungi via WA saja",
      },
    },
    {
      id: "delete_customer",
      section: "Customers",
      method: "DELETE",
      path: "/customers/{id}",
      desc: "Hapus data pelanggan dari database CRM.",
      scopes: ["customers:write", "*"],
      pathParams: "cust-xxxx",
    },
    {
      id: "get_tickets",
      section: "Service Tickets",
      method: "GET",
      path: "/tickets",
      desc: "Ambil daftar tiket reparasi servis pada cabang aktif tenant.",
      scopes: ["tickets:read", "*"],
      queryParams: "status=DITERIMA&search=Sony",
    },
    {
      id: "create_ticket",
      section: "Service Tickets",
      method: "POST",
      path: "/tickets",
      desc: "Buat pendaftaran tiket reparasi baru ke sistem bengkel/service center.",
      scopes: ["tickets:write", "*"],
      sampleBody: {
        customerId: "cust-1",
        deviceName: "MacBook Pro M2 Max",
        deviceBrandModel: "Apple - A2780",
        customerComplaints: "Mati total setelah terkena tumpahan air kopi",
        estimatedCost: 1500000,
        deviceCategory: "Laptop",
        accessoriesLeft: ["Charger Type-C", "Tas Laptop"],
      },
    },
    {
      id: "get_inventory",
      section: "Inventory Control",
      method: "GET",
      path: "/inventory",
      desc: "Ambil daftar seluruh stok barang, komponen suku cadang, dan jasa servis.",
      scopes: ["inventory:read", "*"],
      queryParams: "category=SPAREPART&search=LCD",
    },
    {
      id: "create_inventory",
      section: "Inventory Control",
      method: "POST",
      path: "/inventory",
      desc: "Tambahkan item barang, produk retail, atau jasa servis baru ke katalog inventaris.",
      scopes: ["inventory:write", "*"],
      sampleBody: {
        name: "LCD Screen Assembly iPhone 13 Pro",
        sku: "SP-LCD-IP13P-ORG",
        barcode: "899123456011",
        category: "SPAREPART",
        purchaseCost: 950000,
        sellPrice: 1450000,
        unit: "Pcs",
        stockQty: 8,
      },
    },
    {
      id: "get_sales",
      section: "Sales (POS Transactions)",
      method: "GET",
      path: "/sales",
      desc: "Ambil daftar seluruh riwayat nota faktur transaksi penjualan POS kasir retail.",
      scopes: ["sales:read", "*"],
      queryParams: "paymentMethod=QRIS",
    },
    {
      id: "create_sale",
      section: "Sales (POS Transactions)",
      method: "POST",
      path: "/sales",
      desc: "Catat transaksi penjualan POS baru dan potong stok inventaris otomatis.",
      scopes: ["sales:write", "*"],
      sampleBody: {
        customerId: "cust-1",
        items: [
          {
            productId: "prod-2",
            quantity: 2,
          },
        ],
        paymentMethod: "TUNAI",
        discountAmount: 15000,
      },
    },
  ];

  // Apply endpoint configurations to playground
  const loadIntoPlayground = (ep: (typeof endpoints)[0]) => {
    setPlaygroundEndpoint(ep.path.replace(/^\/|\/\{id\}/g, ""));
    setPlaygroundMethod(ep.method as any);
    setPlaygroundQueryParams(ep.queryParams || "");
    setPlaygroundPathParams(ep.pathParams || "");
    if (ep.sampleBody) {
      setPlaygroundBody(JSON.stringify(ep.sampleBody, null, 2));
    } else {
      setPlaygroundBody("");
    }
    setActiveTab("playground");
  };

  const selectedDoc =
    endpoints.find((e) => e.id === selectedDocId) || endpoints[1];

  const availableAbilities = [
    { id: "*", name: "Wildcard / Full Access (*)" },
    { id: "customers:read", name: "Baca Data Pelanggan (customers:read)" },
    { id: "customers:write", name: "Tulis Data Pelanggan (customers:write)" },
    { id: "tickets:read", name: "Baca Tiket Servis (tickets:read)" },
    { id: "tickets:write", name: "Tulis Tiket Servis (tickets:write)" },
    { id: "inventory:read", name: "Baca Katalog & Stok (inventory:read)" },
    { id: "inventory:write", name: "Tulis Katalog & Stok (inventory:write)" },
    { id: "sales:read", name: "Baca Riwayat Transaksi POS (sales:read)" },
    { id: "sales:write", name: "Catat Transaksi Penjualan (sales:write)" },
  ];

  const toggleAbility = (abilityId: string) => {
    if (abilityId === "*") {
      setSelectedAbilities(["*"]);
      return;
    }

    let updated = [...selectedAbilities].filter((a) => a !== "*");
    if (updated.includes(abilityId)) {
      updated = updated.filter((a) => a !== abilityId);
      if (updated.length === 0) updated = ["*"];
    } else {
      updated.push(abilityId);
    }
    setSelectedAbilities(updated);
  };

  return (
    <div className="bg-slate-50 rounded-3xl p-6 shadow-sm border border-slate-200 animate-fadeIn space-y-6">
      {/* Subtab Switches */}
      <div className="flex border-b border-slate-200 p-1 bg-slate-100 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab("tokens")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tokens"
              ? "bg-white text-accent shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" /> Sanctum Tokens
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "docs"
              ? "bg-white text-accent shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" /> API Docs
        </button>
        <button
          onClick={() => setActiveTab("playground")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "playground"
              ? "bg-white text-accent shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Terminal className="w-4 h-4" /> API Playground
        </button>
      </div>

      {/* ==================== TAB 1: TOKENS MANAGER ==================== */}
      {activeTab === "tokens" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* New Token Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-2 bg-accent-lighter text-accent rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">
                  Generate API Token
                </h4>
                <p className="text-[10px] text-slate-400">
                  Buat kunci integrasi Laravel Sanctum baru.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">
                  Nama Token (Deskripsi)
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="Contoh: Zapier Integrasi CRM Utama"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-accent font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2 font-bold">
                  Izin Ruang Lingkup (Scopes / Abilities)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {availableAbilities.map((ab) => {
                    const isChecked = selectedAbilities.includes(ab.id);
                    return (
                      <div
                        key={ab.id}
                        onClick={() => toggleAbility(ab.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-[11px] font-medium cursor-pointer transition-all ${
                          isChecked
                            ? "bg-accent-lighter/50 border-indigo-200 text-indigo-900 font-semibold"
                            : "bg-white border-slate-100 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div click
                          className="w-3.5 h-3.5 rounded text-accent focus:ring-accent border-slate-300"
                        />
                        <span>{ab.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Key className="w-3.5 h-3.5" /> Buat Personal Access Token
              </button>
            </form>

            {/* Generated Token Display (Show-once) */}
            {generatedToken && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 animate-fadeIn space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider">
                      Token Berhasil Terbuat!
                    </h5>
                    <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">
                      Harap salin token ini sekarang. Demi keamanan data Anda,
                      token ini <strong>hanya ditampilkan sekali saja</strong>{" "}
                      dan tidak dapat diakses kembali.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2.5 bg-slate-900 rounded-xl p-2.5 border border-emerald-300/20">
                  <div className="font-mono text-xs text-slate-100 truncate flex-1 font-bold pl-1 select-all">
                    {showTokenValue
                      ? generatedToken
                      : "••••••••••••••••••••••••••••••••••••••••••••"}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowTokenValue(!showTokenValue)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 transition-all rounded-md"
                    >
                      {showTokenValue ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyToken(generatedToken)}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 text-[10px] font-bold px-2.5 transition-all cursor-pointer"
                    >
                      {copiedToken ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Terkopi
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Salin
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[9px] text-emerald-600/80 italic text-center font-semibold">
                  Nama Kunci: {generatedTokenName}
                </div>
              </div>
            )}
          </div>

          {/* Active Tokens List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent-lighter text-accent rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">
                    Kunci Token Aktif ({tokens.length})
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Sistem otentikasi Laravel Sanctum Bearer Token.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchTokens}
                className="p-1.5 text-slate-400 hover:text-accent transition-all rounded-lg cursor-pointer"
                title="Refresh Daftar Token"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingTokens ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {loadingTokens ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin text-accent" />
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Membuka registri kunci...
                </span>
              </div>
            ) : tokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-700">
                    Belum Ada API Token
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-sm">
                    Gunakan form di sebelah kiri untuk menghasilkan Sanctum
                    Token pertama Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 rounded-xl p-3.5 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3.5 relative overflow-hidden"
                  >
                    {/* Status accent indicator */}
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-accent" />

                    <div className="space-y-2 pl-1.5">
                      <div>
                        <h5 className="font-extrabold text-[12px] text-slate-900 tracking-tight leading-tight">
                          {t.name}
                        </h5>
                        <p className="font-mono text-[9px] text-slate-400 font-bold mt-0.5 tracking-wider uppercase flex items-center gap-1">
                          TOKEN:{" "}
                          <span className="text-accent select-all font-semibold">
                            km_sanctum_token_{t.id.replace("tok-", "act_")}
                            ••••••
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {t.abilities.map((ab) => (
                          <span
                            key={ab}
                            className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                              ab === "*"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-accent-lighter text-accent border border-indigo-100"
                            }`}
                          >
                            {ab}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-[9px] text-slate-400 font-mono">
                        <span>
                          Dibuat:{" "}
                          <strong>
                            {new Date(t.createdAt).toLocaleDateString("id-ID")}
                          </strong>
                        </span>
                        <span>
                          Terakhir Dipakai:{" "}
                          <strong>
                            {t.lastUsedAt
                              ? new Date(t.lastUsedAt).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : "Belum Pernah"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedToken(t.token)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          selectedToken === t.token
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white border border-slate-200 hover:border-slate-300 text-slate-600"
                        }`}
                        title="Pilih Token Untuk Playground"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        {selectedToken === t.token
                          ? "Terpilih Playground"
                          : "Pilih Tes"}
                      </button>

                      {/* Don't allow revoking default administrative token for safety in UI */}
                      {t.id !== "tok-owner-1" ? (
                        <button
                          onClick={() => handleRevokeToken(t.id, t.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition-all cursor-pointer"
                          title="Revoke / Delete Token"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span
                          className="px-1.5 py-1 text-[9px] font-mono font-bold text-amber-600 bg-amber-50 rounded border border-amber-100 uppercase"
                          title="Sistem Master Token"
                        >
                          SYSTEM
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: SWAGGER / OPENAPI DOCS ==================== */}
      {activeTab === "docs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Side Menu Endpoints */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h5 className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">
                REST API Endpoints
              </h5>
              <a
                href="/api/v1/docs"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-accent hover:text-indigo-800 font-bold flex items-center gap-1 uppercase tracking-tight"
              >
                Swagger UI <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {(() => {
              // Group by Section
              const sections: Record<string, typeof endpoints> = {};
              endpoints.forEach((ep) => {
                if (!sections[ep.section]) sections[ep.section] = [];
                sections[ep.section].push(ep);
              });

              return (
                <div className="space-y-4">
                  {Object.entries(sections).map(([sectionName, list]) => (
                    <div key={sectionName} className="space-y-1.5">
                      <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                        {sectionName}
                      </span>
                      <div className="space-y-1">
                        {list.map((ep) => {
                          const isSelected = selectedDocId === ep.id;
                          const methodColors =
                            ep.method === "GET"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : ep.method === "POST"
                                ? "bg-accent-lighter text-accent border-indigo-100"
                                : ep.method === "PUT"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100";

                          return (
                            <div
                              key={ep.id}
                              onClick={() => setSelectedDocId(ep.id)}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs font-semibold"
                                  : "bg-white hover:bg-slate-50 border-transparent text-slate-600"
                              }`}
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black border uppercase tracking-wider ${
                                  isSelected
                                    ? "bg-slate-800 text-slate-100 border-slate-700"
                                    : methodColors
                                }`}
                              >
                                {ep.method}
                              </span>
                              <span className="font-mono text-[10px] truncate flex-1">
                                {ep.path}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Detailed Selected Documentation */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 min-h-[420px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border uppercase tracking-wider ${
                    selectedDoc.method === "GET"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : selectedDoc.method === "POST"
                        ? "bg-accent-lighter text-accent border-indigo-200"
                        : selectedDoc.method === "PUT"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {selectedDoc.method}
                </span>
                <span className="font-mono text-sm font-extrabold text-slate-900 select-all">
                  {selectedDoc.path}
                </span>
              </div>

              <button
                onClick={() => loadIntoPlayground(selectedDoc)}
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white font-extrabold text-[10px] uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" /> Buka Di Playground
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                  Deskripsi Operasi
                </span>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                  {selectedDoc.desc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                    Laravel Sanctum Scopes
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedDoc.scopes.map((sc) => (
                      <span
                        key={sc}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-[9px] font-bold uppercase"
                      >
                        🛡️ {sc}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                    Header Required
                  </span>
                  <div className="mt-1 font-mono text-[10px] text-slate-500 font-bold bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <span className="text-slate-400">Authorization:</span>{" "}
                    Bearer &lt;sanctum_token&gt;
                  </div>
                </div>
              </div>

              {/* Sample Parameters */}
              {(selectedDoc.queryParams || selectedDoc.pathParams) && (
                <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-2">
                  <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                    Parameter Simulasi
                  </span>
                  <div className="space-y-1.5 text-[11px] font-mono">
                    {selectedDoc.pathParams && (
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-accent font-bold">
                          {"{id}"}{" "}
                          <span className="text-slate-400">(path)</span>
                        </span>
                        <span className="text-slate-700 font-semibold">
                          {selectedDoc.pathParams}
                        </span>
                      </div>
                    )}
                    {selectedDoc.queryParams && (
                      <div className="flex justify-between">
                        <span className="text-amber-600 font-bold">
                          Query Params
                        </span>
                        <span className="text-slate-700 font-semibold">
                          ?{selectedDoc.queryParams}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Body */}
              {selectedDoc.sampleBody && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
                      Contoh JSON Payload (Request Body)
                    </span>
                    <button
                      onClick={() =>
                        handleCopyToken(
                          JSON.stringify(selectedDoc.sampleBody, null, 2),
                        )
                      }
                      className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[9px] font-bold font-mono"
                    >
                      <Copy className="w-3 h-3" /> COPY JSON
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[160px] leading-relaxed border border-slate-800">
                    {JSON.stringify(selectedDoc.sampleBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: LIVE PLAYGROUND ==================== */}
      {activeTab === "playground" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="p-2 bg-accent-lighter text-accent rounded-xl">
                <Terminal className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">
                  Test Request Playground
                </h4>
                <p className="text-[10px] text-slate-400">
                  Picu panggilan HTTP riil dan saksikan respon API.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Token Selector */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                  Otorisasi Token Aktif
                </label>
                {tokens.length === 0 ? (
                  <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>
                      Belum ada token. Menggunakan default system token.
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-accent font-semibold text-slate-700 cursor-pointer"
                  >
                    {tokens.map((t) => (
                      <option key={t.id} value={t.token}>
                        {t.name} (abilities: {t.abilities.join(",")})
                      </option>
                    ))}
                    <option value="km_sanctum_invalid_key_test">
                      ❌ INVALID SANCTUM KEY (Tes Error 401)
                    </option>
                  </select>
                )}
              </div>

              {/* Method and Endpoint */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Method
                  </label>
                  <select
                    value={playgroundMethod}
                    onChange={(e) => setPlaygroundMethod(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none font-extrabold focus:border-accent text-slate-800 cursor-pointer"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Gateway Module
                  </label>
                  <select
                    value={playgroundEndpoint}
                    onChange={(e) => {
                      setPlaygroundEndpoint(e.target.value);
                      // Pre-populate sample body if POST
                      const matched = endpoints.find(
                        (ep) =>
                          ep.method === playgroundMethod &&
                          ep.path.includes(e.target.value),
                      );
                      if (matched && matched.sampleBody) {
                        setPlaygroundBody(
                          JSON.stringify(matched.sampleBody, null, 2),
                        );
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none font-semibold focus:border-accent text-slate-700 cursor-pointer"
                  >
                    <option value="customers">👥 Customers (/customers)</option>
                    <option value="tickets">
                      🛠️ Service Tickets (/tickets)
                    </option>
                    <option value="inventory">
                      📦 Warehouse Inventory (/inventory)
                    </option>
                    <option value="sales">🛒 Sales & POS POS (/sales)</option>
                  </select>
                </div>
              </div>

              {/* Path and Query parameters inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Path ID {"{id}"}
                  </label>
                  <input
                    type="text"
                    value={playgroundPathParams}
                    onChange={(e) => setPlaygroundPathParams(e.target.value)}
                    placeholder="cust-1 (Kosongkan jika semua)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">
                    Query Params
                  </label>
                  <input
                    type="text"
                    value={playgroundQueryParams}
                    onChange={(e) => setPlaygroundQueryParams(e.target.value)}
                    placeholder="search=budi&limit=5"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Request Body (for POST / PUT) */}
              {["POST", "PUT"].includes(playgroundMethod) && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Request Body JSON
                  </span>
                  <textarea
                    rows={6}
                    value={playgroundBody}
                    onChange={(e) => setPlaygroundBody(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-slate-100 border border-slate-700 rounded-xl font-mono text-[11px] leading-relaxed outline-none focus:border-accent"
                    placeholder="{ ... }"
                  />
                </div>
              )}

              <button
                onClick={handleExecutePlayground}
                disabled={executingCall}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all mt-1"
              >
                {executingCall ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                    Menghubungkan Gateway...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white text-white" /> Kirim
                    HTTP Request
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response Console Column */}
          <div className="lg:col-span-7 bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-5 shadow-xl min-h-[440px] flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    HTTP Response Console
                  </span>
                </div>

                {apiResponse && (
                  <button
                    onClick={() =>
                      handleCopyToken(JSON.stringify(apiResponse.body, null, 2))
                    }
                    className="text-slate-400 hover:text-slate-200 font-mono text-[9px] font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> COPY RAW JSON
                  </button>
                )}
              </div>

              {!apiResponse ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <Terminal className="w-10 h-10 text-slate-600" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400">
                      Siap Melakukan Tes
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-xs">
                      Pilih modul, konfigurasikan token, lalu klik tombol Kirim
                      HTTP Request untuk menguji otorisasi Sanctum dan respon
                      REST API.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 animate-fadeIn">
                  {/* Status & Timing */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      STATUS:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-black uppercase tracking-wider ${
                        apiResponse.status >= 200 && apiResponse.status < 300
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : apiResponse.status >= 400
                            ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                            : "bg-amber-950/80 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {apiResponse.status} {apiResponse.statusText}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded font-bold">
                      ⏱️ {apiResponse.headers["latency-ms"]}
                    </span>
                  </div>

                  {/* Headers */}
                  <div className="space-y-1">
                    <span className="block text-[9px] font-mono text-slate-500 font-extrabold uppercase tracking-widest">
                      Headers
                    </span>
                    <pre className="bg-slate-950 text-slate-400 p-2.5 rounded-lg text-[9px] font-mono overflow-x-auto border border-slate-800/80 space-y-0.5">
                      {Object.entries(apiResponse.headers).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-indigo-400">{k}:</span>
                          <span className="text-slate-300 font-semibold">
                            {v}
                          </span>
                        </div>
                      ))}
                    </pre>
                  </div>

                  {/* Body Code block */}
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-mono text-slate-500 font-extrabold uppercase tracking-widest">
                      Response Body JSON
                    </span>
                    <pre className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl text-[10px] font-mono overflow-auto max-h-[220px] leading-relaxed border border-slate-800">
                      {JSON.stringify(apiResponse.body, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-3 text-[9px] text-slate-500 font-mono flex items-center justify-between mt-4">
              <span>ROOT ENDPOINT: /api/v1</span>
              <span>REST API GATEWAY v1.0 • SECURED WITH SANCTUM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
