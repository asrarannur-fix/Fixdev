#!/usr/bin/env node
/**
 * FIXDEV Complete Seed ZKOMPUTER — All modules
 * Tenant: ZKOMPUTER (bd7725f3-02cf-4944-bdc9-80ba642a2c55)
 * Run: node scripts/seed-zkomputer.cjs
 */
"use strict";
require("dotenv").config();
const { Client } = require("pg");

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.log("SUPABASE_DB_URL not set"); process.exit(1); }

const TID = "4e94a9c7-7670-4303-8dc8-e3a2b45accb6";
const B1 = "51149a85-9d18-4d5d-82bd-f14d473cf4c6";
const B2 = "4e94a9c7-0002-4d5d-82bd-f14d473cf4c6";
const W2 = "4e94a9c7-0002-4d5d-82bd-f14d473cf4c7";
const OWNER = "33e020e8-f5e4-48d7-af27-1dc45d3a138d";
const CASHIER = OWNER;
const TECH = OWNER;

let ctr = 0;
function uid() { ctr++; return `bd7725f3-${(ctr+100).toString(16).padStart(4,"0")}-4000-8000-${ctr.toString(16).padStart(12,"0")}`; }

async function deleteTenantData(client) {
  const tables = ["service_tickets","pos_transactions","pos_shifts","product_stock","products","customers","coa_accounts","journal_lines","journal_entries","module_records","whatsapp_logs","whatsapp_queue","audit_logs"];
  for (const t of tables) {
    try { await client.query(`DELETE FROM "${t}" WHERE tenant_id=$1`, [TID]); } catch {}
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log("🌱 Complete Seeding ZKOMPUTER...");
    await client.query("INSERT INTO branches(id,tenant_id,name,address,is_active,created_at) VALUES($1,$2,'Cabang Tamalanrea','Tamalanrea',true,NOW()) ON CONFLICT(id) DO NOTHING", [B2,TID]);
    await client.query("INSERT INTO warehouses(id,tenant_id,branch_id,name,location,created_at) VALUES($1,$2,$3,'Gudang Tamalanrea','Tamalanrea',NOW()) ON CONFLICT(id) DO NOTHING", [W2,TID,B2]);
    await deleteTenantData(client);
    console.log("  🗑️ Cleared existing tenant data");

    // ================================================================
    // 1. CUSTOMERS (15)
    // ================================================================
    const custs = [
      ["Andi Wijaya","andi@gmail.com","081244445555","Jl. Rappocini No.4","PERSONAL"],
      ["CV Bintang Tech","info@bintang.com","081244446666","Panakkukang","CORPORATE"],
      ["Dewi Sartika","dewi@email.com","085255551111","Jl. Sungai Saddang","PERSONAL"],
      ["Eko Prasetyo","eko@email.com","085255552222","Jl. Antang Raya","PERSONAL"],
      ["Fina Ramadhani","fina@email.com","085255553333","Jl. Bontoala","PERSONAL"],
      ["Gunawan Saputra","gunawan@email.com","085255554444","Jl. Hertasning","PERSONAL"],
      ["Hendra Lesmana","hendra@email.com","085255555555","Jl. Toddopuli","PERSONAL"],
      ["Ira Suciati","ira@email.com","085255556666","Jl. Urip Sumoharjo","PERSONAL"],
      ["Joko Widodo","joko@email.com","085255557777","Jl. Veteran","PERSONAL"],
      ["Kartika Sari","kartika@email.com","085255558888","Jl. Seruni","PERSONAL"],
      ["PT Makmur Teknologi","info@makmur.co.id","085255559999","Jl. Pelabuhan","CORPORATE"],
      ["SMK Negeri 2 Makassar","smkn2@sch.id","085255550001","Jl. AP Pettarani","CORPORATE"],
      ["Rina Marlina","rina@email.com","085255550002","Jl. Sunu","PERSONAL"],
      ["Surya Darma","surya@email.com","085255550003","Jl. Tamalate","PERSONAL"],
      ["Tono Prasetio","tono@email.com","085255550004","Jl. Borong","PERSONAL"],
    ];
    for (const [n,e,p,a,s] of custs) {
      await client.query("INSERT INTO customers(id,tenant_id,name,email,phone,address,segment,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,n,e,p,a,s]);
    }
    console.log("  ✅ 15 Customers seeded");

    // ================================================================
    // 2. PRODUCTS (20)
    // ================================================================
    const products = [
      ["Rexus DA3","SP-REX-DA3",850000,600000,"SPAREPART","pcs",8],
      ["SSD Samsung 870 EVO 500GB","SP-SSD-500",950000,650000,"SPAREPART","pcs",5],
      ["RAM DDR4 Corsair 8GB 3200MHz","SP-RAM-COR-8",500000,350000,"SPAREPART","pcs",10],
      ["HDD Seagate 1TB","SP-HDD-1T",750000,520000,"SPAREPART","pcs",3],
      ["LCD 14\" Laptop Lenovo","SP-LCD-LEN-14",1200000,750000,"SPAREPART","pcs",2],
      ["Baterai Laptop Dell Inspiron","SP-BAT-DELL",650000,400000,"SPAREPART","pcs",4],
      ["Keyboard Wireless Logitech K380","AK-KEY-LOGI",420000,280000,"AKSESORIS","pcs",8],
      ["Mouse Wireless Logitech M350","AK-MSE-LOGI",310000,180000,"AKSESORIS","pcs",12],
      ["Charger Laptop Delta 65W","AK-CHG-65W",250000,150000,"AKSESORIS","pcs",6],
      ["Kabel USB-C to USB-A 1m","AK-CBL-USBC",45000,20000,"AKSESORIS","pcs",20],
      ["Jasa Instalasi OS Windows 11","JS-OS-INSTALL",150000,0,"JASA","unit",0],
      ["Jasa Servis Ganti LCD","JS-SRV-LCD",200000,0,"JASA","unit",0],
      ["Jasa Servis Ganti Baterai","JS-SRV-BAT",100000,0,"JASA","unit",0],
      ["Jasa Cleaning Laptop","JS-CLN-THERM",175000,0,"JASA","unit",0],
      ["Jasa Backup Recovery Data","JS-BACKUP",250000,0,"JASA","unit",0],
      ["Printer Epson L3210","PRN-EPS-L3210",2800000,2100000,"SPAREPART","pcs",3],
      ["Tinta Epson 003 Black","SP-TINTA-BK",85000,55000,"SPAREPART","pcs",15],
      ["TP-Link Archer C80 Router","NET-TPL-C80",550000,380000,"AKSESORIS","pcs",5],
      ["Webcam Logitech C270 HD","AK-WEB-C270",350000,220000,"AKSESORIS","pcs",4],
      ["Headset Gaming SteelSeries","AK-HS-SS",650000,420000,"AKSESORIS","pcs",3],
      ["UPS APC 650VA","NET-UPS-650",1200000,850000,"SPAREPART","pcs",2],
    ];
    for (const [n,sk,sp,cp,cat,u,m] of products) {
      await client.query("INSERT INTO products(id,tenant_id,name,sku,category,sell_price,purchase_cost,unit,min_stock,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,n,sk,cat,sp,cp,u,m]);
    }
    const pids = (await client.query("SELECT id FROM products WHERE tenant_id=$1 ORDER BY created_at",[TID])).rows.map(r=>r.id);
    console.log("  ✅ 20 Products seeded");

    // ================================================================
    // 3. PRODUCT STOCK
    // ================================================================
    const W1 = "b4059732-7abd-4601-a1ab-6124582693c2";
    const stockItems = [[0,8],[1,15],[2,30],[3,8],[4,3],[5,6],[6,10],[7,15],[8,8],[9,25],[15,5],[16,20],[17,7],[18,8],[19,3],[20,2]];
    for (const [idx,qty] of stockItems) {
      await client.query("INSERT INTO product_stock(product_id,warehouse_id,quantity) VALUES($1,$2,$3) ON CONFLICT(product_id,warehouse_id)DO UPDATE SET quantity=$3",[pids[idx],W1,qty]);
    }
    await client.query("INSERT INTO product_stock(product_id,warehouse_id,quantity) VALUES($1,$2,4) ON CONFLICT(product_id,warehouse_id)DO UPDATE SET quantity=4",[pids[0],W2]);
    console.log("  ✅ Product stock seeded");

    // ================================================================
    // 4. SERVICE TICKETS (12)
    // ================================================================
    const cids = (await client.query("SELECT id FROM customers WHERE tenant_id=$1 ORDER BY created_at",[TID])).rows.map(r=>r.id);
    const tickets = [
      ["TKT-20260101","MacBook Air M1","Apple","Layar blank hitam","DITERIMA",TECH,2500000],
      ["TKT-20260102","Printer Epson L3210","Epson","Cetak garis-garis","SELESAI",TECH,350000],
      ["TKT-20260103","Acer Aspire 5","Acer","Tidak bisa booting","DITERIMA",TECH,750000],
      ["TKT-20260104","Lenovo ThinkPad X1","Lenovo","Keyboard mati","DIAGNOSIS",TECH,450000],
      ["TKT-20260105","HP Pavilion Gaming","HP","Overheat","DITERIMA",TECH,500000],
      ["TKT-20260106","Dell Latitude 7490","Dell","Baterai habis","DITERIMA",TECH,650000],
      ["TKT-20260107","Asus ROG Strix G15","Asus","LCD retak","SELESAI",TECH,1200000],
      ["TKT-20260108","MSI Modern 14","MSI","Touchpad mati","DIAGNOSIS",TECH,300000],
      ["TKT-20260109","iPhone 14 Pro Max","Apple","Ganti baterai","DITERIMA",TECH,450000],
      ["TKT-20260110","Printer Canon MG2570","Canon","Tinta hitam macet","SELESAI",TECH,150000],
      ["TKT-20260111","Samsung Galaxy Tab S9","Samsung","Layar retak","DITERIMA",TECH,1800000],
      ["TKT-20260112","MacBook Pro 14 M3","Apple","Tidak mau charge","DIAGNOSIS",TECH,350000],
    ];
    for (let i=0;i<tickets.length;i++) {
      const [no,dev,brand,comp,sts,techId,est]=tickets[i];
      await client.query("INSERT INTO service_tickets(id,tenant_id,branch_id,ticket_no,device_name,device_brand_model,customer_complaints,status,assigned_tech_id,estimated_cost,customer_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) ON CONFLICT(id)DO UPDATE SET status=EXCLUDED.status",[uid(),TID,i<6?B1:B2,no,dev,brand,comp,sts,techId,est,cids[i%cids.length]]);
    }
    console.log("  ✅ 12 Service tickets seeded");

    // ================================================================
    // 5. POS SHIFT + TRANSACTIONS
    // ================================================================
    const shiftId = uid();
    await client.query("INSERT INTO pos_shifts(id,branch_id,cashier_id,opened_at,starting_cash,status) VALUES($1,$2,$3,NOW(),500000,'OPEN') ON CONFLICT(id)DO NOTHING",[shiftId,B1,CASHIER]);

    const txData = [
      ["INV-20260705-001",950000,"CASH",950000,0],
      ["INV-20260705-002",620000,"DEBIT",620000,0],
      ["INV-20260706-001",420000,"CASH",500000,80000],
      ["INV-20260706-002",500000,"QRIS",500000,0],
      ["INV-20260706-003",150000,"CASH",150000,0],
      ["INV-20260707-001",85000,"CASH",100000,15000],
      ["INV-20260707-002",1200000,"TRANSFER",1200000,0],
      ["INV-20260707-003",310000,"DEBIT",310000,0],
      ["INV-20260707-004",200000,"CASH",200000,0],
      ["INV-20260707-005",2800000,"QRIS",2800000,0],
    ];
    for (let i=0;i<txData.length;i++) {
      const [inv,total,pm,paid,chg]=txData[i];
      await client.query("INSERT INTO pos_transactions(id,tenant_id,branch_id,shift_id,invoice_no,items,subtotal,grand_total,payment_method,amount_paid,change_amount,customer_id,timestamp) VALUES($1,$2,$3,$4,$5,'[]',$6,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,B1,shiftId,inv,total,pm,paid,chg,cids[i%cids.length]]);
    }
    console.log("  ✅ POS shift + 10 transactions seeded");

    // ================================================================
    // 6. COA ACCOUNTS (12)
    // ================================================================
    const coas = [
      ["10100","Kas Utama ZKOMPUTER","ASSET",15000000],
      ["10200","Bank BCA ZKOMPUTER","ASSET",55000000],
      ["10300","Piutang Pelanggan","ASSET",2500000],
      ["10400","Piutang Karyawan","ASSET",500000],
      ["10500","Persediaan Barang","ASSET",35000000],
      ["20100","Utang Usaha","LIABILITY",0],
      ["30100","Modal","EQUITY",50000000],
      ["40100","Pendapatan Jasa Servis","REVENUE",0],
      ["40200","Pendapatan Penjualan","REVENUE",0],
      ["50100","HPP Sparepart","EXPENSE",0],
      ["60100","Beban Gaji","EXPENSE",0],
      ["60200","Beban Operasional","EXPENSE",0],
    ];
    for (const [code,name,type,bal] of coas) {
      await client.query("INSERT INTO coa_accounts(id,tenant_id,code,name,type,balance) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,code)DO UPDATE SET name=EXCLUDED.name",[uid(),TID,code,name,type,bal]);
    }
    console.log("  ✅ 12 COA Accounts seeded");

    // ================================================================
    // 7. MODULE RECORDS: Employees, Payroll, Work Shifts, Workflows
    // ================================================================
    const empData = [
      [uid(),"Budi Hartono","Kasir",3500000,B1],
      [uid(),"Ikhsan Teknisi","Teknisi Servis",4000000,B1],
      [uid(),"Siti Nurhaliza","Admin",3800000,B1],
      [uid(),"Rudi Hermawan","Teknisi Servis",4000000,B2],
      [uid(),"Mega Wati","Kasir",3200000,B2],
      [uid(),"Fajar Pratama","Teknisi Servis",3800000,B2],
    ];
    const eids=empData.map(r=>r[0]);
    for (const [eid,ename,role,salary,bid] of empData) {
      await client.query("INSERT INTO module_records(id,tenant_id,module,record_id,payload,created_at) VALUES($1,$2,'employees',$3,$4,NOW()) ON CONFLICT(id)DO UPDATE SET payload=EXCLUDED.payload",[uid(),TID,eid,JSON.stringify({id:eid,name:ename,role,salary,branchId:bid,tenantId:TID})]);
    }
    console.log("  ✅ Module: Employees seeded");

    // Payroll (3 records)
    for (const emp of empData.slice(0,3)) {
      const pid = uid();
      await client.query("INSERT INTO module_records(id,tenant_id,module,record_id,payload,created_at) VALUES($1,$2,'payroll',$3,$4,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,pid,JSON.stringify({id:pid,employeeId:emp[0],employeeName:emp[1],salary:emp[3],period:"2026-07",grossPay:emp[3],deductions:0,netPay:emp[3],status:"PAID",paidAt:new Date().toISOString()})]);
    }
    console.log("  ✅ Module: Payroll seeded");

    // Work Shifts (6 records)
    const shiftNames=["Budi Hartono","Ikhsan Teknisi","Siti Nurhaliza","Rudi Hermawan","Mega Wati","Fajar Pratama"];
    for (let i=0;i<6;i++) {
      await client.query("INSERT INTO module_records(id,tenant_id,module,record_id,payload,created_at) VALUES($1,$2,'work_shifts',$3,$4,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,uid(),JSON.stringify({employeeId:eids[i],employeeName:shiftNames[i],date:new Date().toISOString().slice(0,10),shiftIn:"08:00",shiftOut:i<4?"17:00":"16:00",status:i%3===0?"PRESENT":"LATE"})]);
    }
    console.log("  ✅ Module: Work Shifts seeded");

    // Workflows (4 records)
    const wfTypes=["service_reminder","invoice_overdue","stock_reorder","customer_followup"];
    for (const wt of wfTypes) {
      await client.query("INSERT INTO module_records(id,tenant_id,module,record_id,payload,created_at) VALUES($1,$2,'workflows',$3,$4,NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,uid(),JSON.stringify({id:uid(),name:"Workflow "+wt,type:wt,enabled:true,tenantId:TID,config:{trigger:"event",action:"notification"},createdAt:new Date().toISOString()})]);
    }
    console.log("  ✅ Module: Workflows seeded");

    // ================================================================
    // 8. WHATSAPP LOGS + QUEUE
    // ================================================================
    for (let i=0;i<5;i++) {
      await client.query("INSERT INTO whatsapp_logs(id,tenant_id,recipient_name,recipient_phone,type,message,status,sender_name,channel,timestamp) VALUES($1,$2,$3,$4,$5,$6,$7,'ZKOMPUTER','WA',NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,"Pelanggan "+(i+1),"0812"+String(100000+i*11111),"TEXT","Pemberitahuan servis selesai","SENT"]);
    }
    await client.query("INSERT INTO whatsapp_queue(id,tenant_id,recipient_name,recipient_phone,type,message,scheduled_time,status,created_at) VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL'1 hour','PENDING',NOW()) ON CONFLICT(id)DO NOTHING",[uid(),TID,"Andi Wijaya","081244445555","TEXT","Pengingat servis berkala"]);
    console.log("  ✅ WhatsApp logs + queue seeded");

    // ================================================================
    // 9. AUDIT LOGS (10)
    // ================================================================
    const actions = ["LOGIN","LOGOUT","CREATE_TRANSACTION","UPDATE_TICKET","CREATE_CUSTOMER","UPDATE_PRODUCT","CREATE_EMPLOYEE","VIEW_REPORT","EXPORT_DATA","DELETE_BACKUP"];
    for (const act of actions) {
      await client.query("INSERT INTO audit_logs(id,tenant_id,branch_id,user_id,user_name,action,category,risk_level,timestamp,verified) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),true) ON CONFLICT(id)DO NOTHING",[uid(),TID,B1,OWNER,"Asrar Annur",act,"API","LOW"]);
    }
    console.log("  ✅ Audit logs seeded");

    // ================================================================
    // 10. JOURNAL ENTRIES (5) — query actual COA IDs first
    // ================================================================
    const coaRes = await client.query("SELECT id, code FROM coa_accounts WHERE tenant_id=$1", [TID]);
    const coaMap = Object.fromEntries(coaRes.rows.map(r => [r.code, r.id]));
    const cashAcct = coaMap["10100"] || coaRes.rows[0].id;
    const revAcct = coaMap["40200"] || coaRes.rows[1].id;

    const jes=[["INV-20260705-001","Penjualan SSD Samsung",950000],["INV-20260705-002","Penjualan Mouse Logitech",620000],["INV-20260706-001","Penjualan Keyboard Logitech",420000],["INV-20260706-002","Penjualan RAM Corsair",500000],["INV-20260707-001","Penjualan Tinta Epson",85000]];
    for (const [ref,desc,amt] of jes) {
      const jid=uid();
      await client.query("INSERT INTO journal_entries(id,tenant_id,branch_id,date,reference_no,description,is_posted,created_at) VALUES($1,$2,$3,CURRENT_DATE,$4,$5,true,NOW()) ON CONFLICT(id)DO NOTHING",[jid,TID,B1,ref,desc]);
      await client.query("INSERT INTO journal_lines(id,journal_entry_id,account_id,debit,credit) VALUES($1,$2,$3,$4,0),($5,$6,$7,0,$8) ON CONFLICT(id)DO NOTHING",[uid(),jid,cashAcct,amt,uid(),jid,revAcct,amt]);
    }
    console.log("  ✅ 5 Journal entries + lines seeded");

    console.log("\n🎉 ZKOMPUTER complete seeding done!");
  } catch (err) {
    console.error("\n❌ Seed error:", err.message);
    process.exit(1);
  } finally { await client.end(); }
}
main();
