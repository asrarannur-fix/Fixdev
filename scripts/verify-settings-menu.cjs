require("dotenv").config();
const { chromium } = require("playwright");
const tabs=["branding","branches","rbac","modules-config","printer-terms","workflows","maintenance-contract","operational-config","subscription","loyalty","import-export","app-config","whatsapp","telegram","notifications","developer-api","security","backup"];
(async()=>{
 const b=await chromium.launch({headless:true,args:["--no-sandbox"]});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];
 p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>m.type()==="error"&&errors.push(m.text()));
 await p.goto("http://localhost:3000",{waitUntil:"domcontentloaded"});await p.waitForTimeout(3000);
 await p.getByRole("button",{name:/^Masuk$/}).click();await p.locator('input[type=email]').fill(process.env.TEST_TENANT_EMAIL);await p.locator('input[type=password]').fill(process.env.TEST_TENANT_PASSWORD);await p.locator('#login-page button[type=submit]').click();await p.waitForTimeout(8000);
 console.log("LOGIN",await p.locator("#main-app-container").count()===1?"PASS":"FAIL");
 const menuLabels={branding:"White-Label",branches:"Multi-Cabang",rbac:"Hak",'modules-config':"Parameter",'printer-terms':"Printer",workflows:"Workflow",'maintenance-contract':"Kontrak",'operational-config':"Operasional",subscription:"SaaS",loyalty:"Voucher",'import-export':"Impor",'app-config':"Aplikasi",whatsapp:"WhatsApp",telegram:"Bot",notifications:"Integrasi",'developer-api':"Developer",security:"Keamanan",backup:"Backup"};
 const results=[];
 for(const id of tabs){
  await p.locator("#settings-trigger-btn").click();await p.waitForTimeout(250);
  const menu=p.locator('[role="menu"] button').filter({hasText:menuLabels[id]}).first();
  if(!await menu.count()){results.push({id,status:"MENU_MISSING"});continue;}
  await menu.click();await p.waitForTimeout(700);
  const pane=await p.locator("#settings-pane").count();const active=await p.locator(`#settings-tab-${id}`).count();
  results.push({id,status:pane&&active?"PASS":pane?"PANE_NO_TAB":"PANE_MISSING"});
 }
 console.log(JSON.stringify({results,errors},null,2));await b.close();
})().catch(e=>{console.error(e.stack);process.exit(1)});
