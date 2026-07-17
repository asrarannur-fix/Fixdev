#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path");
const env=fs.readFileSync(path.join(__dirname,"..",".env"),"utf8");
const raw=name=>env.split(/\r?\n/).find(x=>x.startsWith(name+"="))?.slice(name.length+1).trim()||"";
(async()=>{
 const {chromium}=require("playwright");const b=await chromium.launch({headless:true});
 const p=await b.newPage({viewport:{width:1440,height:900},bypassCSP:true});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));
 try{
  await p.goto("https://fixdev.web.id",{waitUntil:"networkidle",timeout:30000});
  await p.click("button:has-text('Masuk')");
  await p.fill('input[type="email"]',raw("TEST_TENANT_EMAIL"));
  await p.fill('input[type="password"]',raw("TEST_TENANT_PASSWORD"));
  await p.click("form button:has-text('Masuk')");await p.waitForTimeout(5000);
  await p.getByText("Servis",{exact:true}).first().click();await p.waitForTimeout(1800);
  const text=await p.locator("body").innerText();
  console.log("SERVICE_VIEW_OK",/Penerimaan|Daftar Servis|Servis Baru/.test(text));
  console.log("PAGE_ERRORS",errors.length);
  await p.screenshot({path:"/tmp/service-list-smoke.png"});
 }catch(e){console.log("SERVICE_VIEW_FAIL",e.message);process.exitCode=1;}
 await b.close();
})();