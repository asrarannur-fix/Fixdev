#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const fs=require("fs"),path=require("path");
let e=0,p=0;
const L=m=>console.log(m),P=m=>{L(`  ✅ PASS: ${m}`);p++},F=m=>{L(`  ❌ FAIL: ${m}`);e++};
L("=== FIXDEV E2E Smoke Test ===\n");
L("--- 1. Seed Data Integrity ---");
const s=fs.readFileSync(path.resolve(__dirname,"..","src","mocks","seedData.ts"),"utf-8");
s.includes("FIXDEV Demo Utama")?P("Tenant FIXDEV Demo Utama"):F("Missing Tenant FIXDEV Demo Utama");
s.includes("FIXDEV Demo Pembanding")?P("Tenant FIXDEV Demo Pembanding"):F("Missing Tenant FIXDEV Demo Pembanding");
s.includes("Cabang Pusat")?P("Cabang Pusat"):F("Missing Cabang Pusat");
s.includes("Cabang Kedua")?P("Cabang Kedua"):F("Missing Cabang Kedua");
s.includes("Gudang Pusat")?P("Gudang Pusat"):F("Missing Gudang Pusat");
[["asrarannur1@gmail.com","Asrar Super Admin"],["owner@komputermakassar.com","Andi Owner"],["admin.toko@komputermakassar.com","Ahmad Admin Toko"],["siti.kasir@komputermakassar.com","Siti Rahma Kasir"],["budi.tech@komputermakassar.com","Budi Teknisi Laptop"],["teknisi2@komputermakassar.com","Eko Teknisi Printer"],["customer1@gmail.com","Customer Personal 1 User"],["owner@tenantb.com","Beni Owner B"],["admin@tenantb.com","Toni Admin B"]].forEach(([em,n])=>{s.includes(em)?P(`User ${n}`):F(`Missing user ${n}`)});
["Customer Personal 1","Customer Personal 2","PT Demo Service","Sekolah Demo Makassar","Customer Demo B"].forEach(c=>{s.includes(c)?P(`Customer ${c}`):F(`Customer ${c} missing`)});
s.includes("wh-mks-3")?F("Stale wh-mks-3 ref found"):P("No stale wh-mks-3 refs");
L("\n--- 2. Component Prop Safety ---");
["InventoryTab","POSTab","HRTab"].forEach(c=>{const f=path.resolve(__dirname,"..","src","components",c==="SettingsTab"?"":c==="HRTab"?"tenant":"tenant",c+".tsx");fs.existsSync(f)?P(`${c}.tsx exists`):F(`${c}.tsx missing`)});
L("\n--- 3. Customer Portal Auto-Resolve ---");
const pC=fs.readFileSync(path.resolve(__dirname,"..","src","components","CustomerPortal.tsx"),"utf-8");
pC.includes('currentUser.role === "CUSTOMER"')?P("CUSTOMER auto-resolve logic"):F("No auto-resolve logic");
L("\n--- 4. Context State Safety ---");
const cC=fs.readFileSync(path.resolve(__dirname,"..","src","context","SaaSContext.tsx"),"utf-8");
const states=["tenants","branches","warehouses","users","customers","products","services","employees","vouchers","auditLogs","workShifts","cashTransactions","transactions","accounts","journals","fieldVisits","shifts","payroll","commissions","fraudAlerts","stockMovements","inventoryTransfers","offlineQueue","internalMessages","supportTickets","tasks","workflows"];
let u=0;
states.forEach(st=>{const lines=cC.split("\n"),hasParseArray=lines.some(l=>l.includes("parseArray")&&l.includes(`"saas_${st.replace(/([A-Z])/g,'_$1').toLowerCase().replace(/^_/,'')}`));if(!hasParseArray){const hasUnsafe=lines.some(l=>l.includes(`"saas_${st}`)&&l.includes("JSON.parse"));hasUnsafe?(F(`State '${st}' unsafe JSON.parse`),u++):void 0}});
u===0?P("All array states use safe parseArray"):L(`  ${u} unsafe state(s) found`);
cC.includes("parsed.id")&&cC.includes("try")?P("currentUser guard exists"):F("currentUser guard missing");
L("\n--- 5. Tenant/Branch Isolation ---");
cC.includes("tenantId === currentTenantId")?P("Tenant isolation filter"):F("Missing tenant isolation");
cC.includes("branchId === currentBranchId")?P("Branch isolation filter"):F("Missing branch isolation");
L("\n--- 6. Service Workflow ---");
cC.includes("addServiceTicket")?P("addServiceTicket exists"):F("Missing addServiceTicket");
cC.includes("handoverServiceDevice")?P("handoverServiceDevice exists"):F("Missing handoverServiceDevice");
L("\n--- 7. POS Stock Deduction ---");
const posC=fs.readFileSync(path.resolve(__dirname,"..","src","server","controllers","pos.controller.ts"),"utf-8");
(posC.includes("product_stock")&&posC.includes("stock_movements")&&posC.includes("quantity - $1"))
  ?P("POS stock deduction (backend atomic)")
  :F("Missing POS stock deduction");
L("\n--- 8. Settings ---");
cC.includes("updateTenant")?P("updateTenant exists"):F("Missing updateTenant");
L("\n--- 9. Audit Trail ---");
cC.includes("addLog")?P("addLog exists"):F("Missing addLog");
L("\n--- 10. HRM ---");
const hC=fs.readFileSync(path.resolve(__dirname,"..","src","components","tenant","HRTab.tsx"),"utf-8");
hC.includes("payroll")||hC.includes("Payroll")?P("Payroll detected in HRTab"):F("No payroll in HRTab");
hC.includes("commission")||hC.includes("Commission")?P("Commission detected in HRTab"):F("No commission in HRTab");
L(`\n=== Results: ${p} PASS, ${e} FAIL ===`);
if(e>0){L("\n❌ E2E Smoke Test: FAILED");process.exit(1)}
else{L("\n✅ E2E Smoke Test: PASS - All validations passed")}
