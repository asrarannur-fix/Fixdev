import type { Request, Response } from "express";
import { z } from "zod";
import { dbQuery, dbTransaction } from "../../lib/db.js";

const componentSchema = z.object({
  warehouseId: z.string().uuid(), name: z.string().trim().min(2), sku: z.string().trim().min(2),
  category: z.enum(["IC", "KAPASITOR", "RESISTOR", "SEKRING", "FLEXIBLE", "KONEKTOR"]),
  rackId: z.string().trim().min(1), drawerId: z.string().trim().min(1), stockQty: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0), compatModels: z.array(z.string()).default([]),
  purchaseCost: z.number().min(0).default(0), sellPrice: z.number().min(0).default(0),
  avgWeeklyConsumption: z.number().min(0).default(0), leadTimeDays: z.number().int().min(0).default(0),
  supplierName: z.string().optional(),
});
const updateSchema = componentSchema.omit({ warehouseId: true, stockQty: true }).partial().extend({ isActive: z.boolean().optional() });
const consumeSchema = z.object({
  ticketId: z.string().uuid(), warehouseId: z.string().uuid().optional(), quantity: z.number().int().positive(),
  chargeable: z.boolean().default(false), unitPrice: z.number().min(0).optional(), note: z.string().optional(),
  idempotencyKey: z.string().min(8),
});
const adjustSchema = z.object({
  warehouseId: z.string().uuid(), mode: z.enum(["IN", "OUT", "SET"]), quantity: z.number().int().min(0),
  reason: z.string().trim().min(3), referenceNo: z.string().trim().optional(), idempotencyKey: z.string().min(8),
});

const componentSelect = `mc.id,mc.tenant_id AS "tenantId",ps.warehouse_id AS "warehouseId",mc.product_id AS "productId",
 p.name,p.sku,mc.category,mc.rack_id AS "rackId",mc.drawer_id AS "drawerId",ps.quantity::float AS "stockQty",
 p.min_stock::float AS "minStock",mc.compat_models AS "compatModels",p.purchase_cost::float AS "purchaseCost",
 p.sell_price::float AS "sellPrice",mc.avg_weekly_consumption::float AS "avgWeeklyConsumption",
 mc.lead_time_days AS "leadTimeDays",mc.supplier_name AS "supplierName",p.is_active AS "isActive"`;
const componentJoin = `FROM micro_components mc JOIN products p ON p.id=mc.product_id
 JOIN product_stock ps ON ps.product_id=p.id`;

function httpError(message: string, status: number) { const error: any = new Error(message); error.status = status; return error; }

export async function listMicroComponents(req: Request, res: Response) {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const warehouseId = String(req.query.warehouseId || "").trim();
    const result = await dbQuery(
      `SELECT ${componentSelect} ${componentJoin}
       WHERE mc.tenant_id=$1 AND p.is_active=TRUE AND ($2='' OR mc.category=$2) AND ($3='' OR ps.warehouse_id::text=$3)
       AND ($4='' OR p.name ILIKE '%'||$4||'%' OR p.sku ILIKE '%'||$4||'%' OR mc.compat_models::text ILIKE '%'||$4||'%')
       ORDER BY p.name,ps.warehouse_id`, [req.tenantId, category, warehouseId, search]);
    res.json({ data: result.rows });
  } catch (error: any) { res.status(500).json({ error: "Operasi komponen gagal diproses." }); }
}

export async function createMicroComponent(req: Request, res: Response) {
  const parsed = componentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Data komponen mikro tidak valid.", details: parsed.error.flatten() });
  try {
    const result = await dbTransaction(async client => {
      const d = parsed.data;
      const warehouse = await client.query("SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2", [d.warehouseId, req.tenantId]);
      if (!warehouse.rows[0]) throw httpError("Gudang tidak ditemukan pada tenant aktif.", 404);
      const product = await client.query(
        `INSERT INTO products(tenant_id,name,sku,barcode,category,purchase_cost,sell_price,unit,min_stock,reorder_level,grade,is_consignment,item_type,is_active)
         VALUES($1,$2,$3,$3,'SPAREPART',$4,$5,'pcs',$6,$6,'NEW',FALSE,'MICRO_COMPONENT',TRUE) RETURNING id`,
        [req.tenantId, d.name, d.sku.toUpperCase(), d.purchaseCost, d.sellPrice, d.minStock]);
      const productId = product.rows[0].id;
      const component = await client.query(
        `INSERT INTO micro_components(tenant_id,warehouse_id,product_id,name,sku,category,rack_id,drawer_id,stock_qty,min_stock,compat_models,purchase_cost,sell_price,avg_weekly_consumption,lead_time_days,supplier_name)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10::jsonb,$11,$12,$13,$14,$15) RETURNING id`,
        [req.tenantId,d.warehouseId,productId,d.name,d.sku.toUpperCase(),d.category,d.rackId,d.drawerId,d.minStock,
          JSON.stringify(d.compatModels),d.purchaseCost,d.sellPrice,d.avgWeeklyConsumption,d.leadTimeDays,d.supplierName||null]);
      await client.query("INSERT INTO product_stock(product_id,warehouse_id,quantity) VALUES($1,$2,$3)", [productId,d.warehouseId,d.stockQty]);
      if (d.stockQty > 0) await client.query(
        "INSERT INTO stock_movements(tenant_id,warehouse_id,product_id,type,quantity,reference_no,note) VALUES($1,$2,$3,'IN',$4,$5,'Saldo awal komponen mikro')",
        [req.tenantId,d.warehouseId,productId,d.stockQty,`OPEN-${d.sku.toUpperCase()}`]);
      return component.rows[0].id;
    });
    const row = await dbQuery(`SELECT ${componentSelect} ${componentJoin} WHERE mc.id=$1 AND mc.tenant_id=$2`, [result, req.tenantId]);
    res.status(201).json({ data: row.rows[0] });
  } catch (error: any) { res.status(error.status || (error.code === "23505" ? 409 : 500)).json({ error: error.code === "23505" ? "SKU sudah digunakan pada Inventory." : error.message }); }
}

export async function updateMicroComponent(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "Perubahan komponen tidak valid." });
  try {
    await dbTransaction(async client => {
      const found = await client.query("SELECT mc.product_id FROM micro_components mc WHERE mc.id=$1 AND mc.tenant_id=$2 FOR UPDATE", [req.params.id,req.tenantId]);
      if (!found.rows[0]) throw httpError("Komponen tidak ditemukan.",404);
      const d=parsed.data; const productSets:string[]=[]; const productValues:any[]=[];
      for (const [column,value] of [["name",d.name],["sku",d.sku?.toUpperCase()],["purchase_cost",d.purchaseCost],["sell_price",d.sellPrice],["min_stock",d.minStock],["reorder_level",d.minStock],["is_active",d.isActive]] as const) if(value!==undefined){productValues.push(value);productSets.push(`${column}=$${productValues.length}`);}
      if(productSets.length) await client.query(`UPDATE products SET ${productSets.join(",")} WHERE id=$${productValues.length+1} AND tenant_id=$${productValues.length+2}`,[...productValues,found.rows[0].product_id,req.tenantId]);
      const microSets:string[]=[]; const microValues:any[]=[];
      for(const [column,value] of [["name",d.name],["sku",d.sku?.toUpperCase()],["category",d.category],["rack_id",d.rackId],["drawer_id",d.drawerId],["min_stock",d.minStock],["compat_models",d.compatModels?JSON.stringify(d.compatModels):undefined],["purchase_cost",d.purchaseCost],["sell_price",d.sellPrice],["avg_weekly_consumption",d.avgWeeklyConsumption],["lead_time_days",d.leadTimeDays],["supplier_name",d.supplierName]] as const) if(value!==undefined){microValues.push(value);microSets.push(`${column}=$${microValues.length}${column==='compat_models'?'::jsonb':''}`);}
      if(microSets.length) await client.query(`UPDATE micro_components SET ${microSets.join(",")},updated_at=NOW() WHERE id=$${microValues.length+1} AND tenant_id=$${microValues.length+2}`,[...microValues,req.params.id,req.tenantId]);
    });
    const row=await dbQuery(`SELECT ${componentSelect} ${componentJoin} WHERE mc.id=$1 AND mc.tenant_id=$2`,[req.params.id,req.tenantId]);
    res.json({data:row.rows});
  } catch(error:any){res.status(error.status||(error.code==="23505"?409:500)).json({error:error.code==="23505"?"SKU sudah digunakan pada Inventory.":error.message});}
}

export async function adjustMicroComponentStock(req: Request,res: Response){
  const parsed=adjustSchema.safeParse(req.body); if(!parsed.success)return res.status(422).json({error:"Data perubahan stok tidak valid."});
  try{
    const result=await dbTransaction(async client=>{
      const d=parsed.data;
      const existing=await client.query("SELECT id FROM micro_component_movements WHERE tenant_id=$1 AND reference_no=$2",[req.tenantId,d.idempotencyKey]);
      if(existing.rows[0]) return {idempotent:true};
      const comp=await client.query("SELECT mc.id,mc.product_id FROM micro_components mc JOIN products p ON p.id=mc.product_id WHERE mc.id=$1 AND mc.tenant_id=$2 AND p.is_active=TRUE FOR UPDATE",[req.params.id,req.tenantId]);
      if(!comp.rows[0])throw httpError("Komponen tidak ditemukan atau sudah diarsipkan.",404);
      const warehouse = await client.query("SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2", [d.warehouseId, req.tenantId]);
      if (!warehouse.rows[0]) throw httpError("Gudang tidak ditemukan pada tenant aktif.", 404);
      const stock=await client.query("SELECT quantity FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE",[comp.rows[0].product_id,d.warehouseId]);
      if(!stock.rows[0])throw httpError("Komponen belum tersedia pada gudang ini.",404);
      const before=Number(stock.rows[0].quantity); const after=d.mode==="IN"?before+d.quantity:d.mode==="OUT"?before-d.quantity:d.quantity;
      if(after<0)throw httpError("Stok tidak mencukupi.",409);
      await client.query("UPDATE product_stock SET quantity=$1 WHERE product_id=$2 AND warehouse_id=$3",[after,comp.rows[0].product_id,d.warehouseId]);
      const movementQty=after-before; const ref=d.referenceNo||d.idempotencyKey;
      await client.query("INSERT INTO stock_movements(tenant_id,warehouse_id,product_id,type,quantity,reference_no,note) VALUES($1,$2,$3,$4,$5,$6,$7)",[req.tenantId,d.warehouseId,comp.rows[0].product_id,d.mode==="SET"?"ADJUSTMENT":d.mode,movementQty,ref,d.reason]);
      await client.query("INSERT INTO micro_component_movements(tenant_id,component_id,product_id,warehouse_id,movement_type,quantity,reference_no,balance_before,balance_after,actor_id,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[req.tenantId,comp.rows[0].id,comp.rows[0].product_id,d.warehouseId,d.mode,movementQty,d.idempotencyKey,before,after,req.authActor?.userId,d.reason]);
      return{idempotent:false};
    });
    const row=await dbQuery(`SELECT ${componentSelect} ${componentJoin} WHERE mc.id=$1 AND mc.tenant_id=$2`,[req.params.id,req.tenantId]); res.json({data:{component:row.rows.find(x=>x.warehouseId===parsed.data.warehouseId),...result}});
  }catch(error:any){res.status(error.status||500).json({error:error.message});}
}

export async function consumeMicroComponent(req: Request, res: Response) {
  const parsed = consumeSchema.safeParse(req.body); if (!parsed.success) return res.status(422).json({ error: "Data pemakaian komponen tidak valid." });
  try {
    const result = await dbTransaction(async client => {
      const d=parsed.data;
      const duplicate=await client.query("SELECT * FROM micro_component_usages WHERE tenant_id=$1 AND idempotency_key=$2",[req.tenantId,d.idempotencyKey]);
      const ticketId=duplicate.rows[0]?.ticket_id||d.ticketId;
      if(duplicate.rows[0]) return {usage:duplicate.rows[0],ticketId,idempotent:true};
      const ticket=await client.query("SELECT id,ticket_no,status,estimated_cost FROM service_tickets WHERE id=$1 AND tenant_id=$2 FOR UPDATE",[d.ticketId,req.tenantId]);
      if(!ticket.rows[0])throw httpError("Tiket tidak ditemukan.",404);
      if(!["SEDANG_DIKERJAKAN","REWORK","DIAGNOSA"].includes(ticket.rows[0].status))throw httpError("Komponen mikro hanya dapat dipakai saat diagnosis/pengerjaan.",409);
      const component=await client.query("SELECT mc.*,p.name AS product_name,p.purchase_cost AS product_cost,p.sell_price AS product_price,p.is_active FROM micro_components mc JOIN products p ON p.id=mc.product_id WHERE mc.id=$1 AND mc.tenant_id=$2 FOR UPDATE",[req.params.id,req.tenantId]); const comp=component.rows[0];
      if(!comp||!comp.is_active)throw httpError("Komponen tidak ditemukan atau sudah diarsipkan.",404);
      const warehouseId=d.warehouseId||comp.warehouse_id;
      const warehouse = await client.query("SELECT id FROM warehouses WHERE id=$1 AND tenant_id=$2", [warehouseId, req.tenantId]);
      if (!warehouse.rows[0]) throw httpError("Gudang tidak ditemukan pada tenant aktif.", 404);
      const stock=await client.query("SELECT quantity FROM product_stock WHERE product_id=$1 AND warehouse_id=$2 FOR UPDATE",[comp.product_id,warehouseId]);
      const before=Number(stock.rows[0]?.quantity||0); if(before<d.quantity)throw httpError("Stok komponen mikro kosong/tidak mencukupi. Gunakan alur Menunggu Spare Part.",409);
      const after=before-d.quantity; const unitPrice=d.unitPrice??Number(comp.product_price); const hpp=Number(comp.product_cost)*d.quantity; const charge=d.chargeable?unitPrice*d.quantity:0;
      const usage=await client.query(`INSERT INTO micro_component_usages(tenant_id,ticket_id,component_id,warehouse_id,idempotency_key,quantity,unit_cost,hpp_total,chargeable,unit_price,charge_total,note,consumed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[req.tenantId,d.ticketId,comp.id,warehouseId,d.idempotencyKey,d.quantity,comp.product_cost,hpp,d.chargeable,unitPrice,charge,d.note||null,req.authActor?.userId]);
      await client.query("UPDATE product_stock SET quantity=$1 WHERE product_id=$2 AND warehouse_id=$3",[after,comp.product_id,warehouseId]);
      await client.query("INSERT INTO stock_movements(tenant_id,warehouse_id,product_id,type,quantity,reference_no,note) VALUES($1,$2,$3,'OUT',$4,$5,$6)",[req.tenantId,warehouseId,comp.product_id,-d.quantity,ticket.rows[0].ticket_no,d.note||"Pemakaian tiket servis"]);
      await client.query("INSERT INTO micro_component_movements(tenant_id,component_id,product_id,warehouse_id,ticket_id,movement_type,quantity,reference_no,balance_before,balance_after,actor_id,note) VALUES($1,$2,$3,$4,$5,'SERVICE_CONSUME',$6,$7,$8,$9,$10,$11)",[req.tenantId,comp.id,comp.product_id,warehouseId,d.ticketId,-d.quantity,d.idempotencyKey,before,after,req.authActor?.userId,d.note||null]);
      const usages=await client.query(`SELECT u.id,u.component_id AS "componentId",p.name,u.quantity::float,u.unit_cost::float AS "unitCost",u.hpp_total::float AS "hppTotal",u.chargeable,u.unit_price::float AS "unitPrice",u.charge_total::float AS "chargeTotal",u.consumed_at AS "consumedAt" FROM micro_component_usages u JOIN micro_components mc ON mc.id=u.component_id JOIN products p ON p.id=mc.product_id WHERE u.tenant_id=$1 AND u.ticket_id=$2 ORDER BY u.consumed_at`,[req.tenantId,d.ticketId]);
      await client.query("UPDATE service_tickets SET micro_component_usages=$1::jsonb,estimated_cost=estimated_cost+$2,timeline=COALESCE(timeline,'[]'::jsonb)||$3::jsonb,updated_at=NOW() WHERE id=$4 AND tenant_id=$5",[JSON.stringify(usages.rows),charge,JSON.stringify([{status:ticket.rows[0].status,note:`Komponen mikro ${comp.product_name} × ${d.quantity} digunakan${d.chargeable?" dan ditagihkan":" sebagai bahan internal"}.`,timestamp:new Date().toISOString(),operator:"Sistem"}]),d.ticketId,req.tenantId]);
      return{usage:usage.rows[0],ticketId,idempotent:false};
    });
    const ticket=await dbQuery(`SELECT id,tenant_id AS "tenantId",branch_id AS "branchId",ticket_no AS "ticketNo",customer_id AS "customerId",device_name AS "deviceName",device_brand_model AS "deviceBrandModel",status,estimated_cost::float AS "estimatedCost",micro_component_usages AS "microComponentUsages",timeline,parts_used AS "partsUsed",warranty_months AS "warrantyMonths" FROM service_tickets WHERE id=$1 AND tenant_id=$2`,[result.ticketId,req.tenantId]);
    const components=await dbQuery(`SELECT ${componentSelect} ${componentJoin} WHERE mc.id=$1 AND mc.tenant_id=$2`,[req.params.id,req.tenantId]);
    res.json({data:{usage:result.usage,component:components.rows[0],components:components.rows,ticket:ticket.rows[0],idempotent:result.idempotent}});
  }catch(error:any){res.status(error.status||500).json({error:error.message});}
}
