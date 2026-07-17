#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path");
const env=fs.readFileSync(path.join(__dirname,"..",".env"),"utf8");
const raw=name=>env.split(/\r?\n/).find(x=>x.startsWith(name+"="))?.slice(name.length+1).trim()||"";
const EMAIL=raw("TEST_TENANT_EMAIL"),PASS=raw("TEST_TENANT_PASSWORD");
(async()=>{
 const {chromium}=require("playwright");const b=await chromium.launch({headless:true});
 const p=await b.newPage({viewport:{width:1440,height:900},bypassCSP:true});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 try{
  await p.goto("https://fixdev.web.id",{waitUntil:"networkidle",timeout:30000});
  await p.click("button:has-text('Masuk')");
  await p.fill('input[type="email"]',EMAIL);await p.fill('input[type="password"]',PASS);
  await p.click("form button:has-text('Masuk')");await p.waitForTimeout(6000);
  console.log("LOGIN_OK");
  // click each navigation label
  const targets=["Servis","Inventory","POS","Pengaturan","Portal Pelanggan","AI Copilot","Beranda"];
  const nav=await p.locator("button, a").allInnerTexts();
  console.log("ALL_NAV_SAMPLE",nav.filter(x=>x&&x.trim().length<30).slice(0,50).join(" | "));
  // Try Finance/HR hidden under 'Keuangan & Aset' or sidebar icons
  for(const label of ["Akuntansi","SDM","HR","Keuangan","Laporan"]){
   const hit=await p.getByText(label,{exact:false}).first().count();
   console.log(`LABEL_${label}`,hit);
  }
  await p.screenshot({path:"/tmp/tenant-allnav.png"});
  console.log("PAGE_ERRORS",errors.length);
 }catch(e){console.log("FATAL",e.message);await p.screenshot({path:"/tmp/tenant-fail.png"});}
 await b.close();
})();
