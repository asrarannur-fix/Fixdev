import type { WhatsAppTemplate } from '../../types/index.js';

function renderWaTemplate(template: string, ctx: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (key in ctx && ctx[key] !== undefined && ctx[key] !== null) {
      return String(ctx[key]);
    }
    return `{${key}}`;
  });
}

async function getTenantWaTemplate(
  client: any,
  tenantId: string,
  category: string
): Promise<string | null> {
  const result = await client.query(
    `SELECT settings #>> '{waConfig,templates}' AS templates FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const raw = result.rows[0]?.templates;
  if (!raw) return null;
  let templates: WhatsAppTemplate[];
  try {
    templates = JSON.parse(raw);
  } catch {
    return null;
  }
  const match = templates.find((t) => t.category === category && t.content);
  return match ? match.content : null;
}

export async function queueNotification(
  client: any,
  tenantId: string,
  ticket: any,
  eventId: string,
  message: string,
  templateCategory = 'SERVICE_UPDATE',
  extraContext: any = {}
) {
  const tenantSettings = await client.query(`SELECT settings FROM tenants WHERE id=$1`, [tenantId]);
  const waConfig = tenantSettings.rows[0]?.settings?.waConfig;
  if (waConfig?.sendingMethod === 'MANUAL') {
    // If sending method is manual, do not queue system notifications
    return;
  }

  const customer = await client.query(
    'SELECT name,phone FROM customers WHERE id=$1 AND tenant_id=$2',
    [ticket.customerId, tenantId]
  );
  if (!customer.rows[0]?.phone) return;

  let finalMessage = message;
  const template = await getTenantWaTemplate(client, tenantId, templateCategory);
  if (template) {
    const ctx: Record<string, any> = {
      customer_name: customer.rows[0].name,
      ticket_no: ticket.ticketNo,
      ticket_status: extraContext.toStatus || ticket.status,
      device_name: ticket.deviceName,
      status_note: message,
      ...extraContext.metadata,
    };
    finalMessage = renderWaTemplate(template, ctx);
  }

  await client.query(
    `INSERT INTO whatsapp_queue (tenant_id,recipient_name,recipient_phone,type,message,status,ticket_id,event_id,scheduled_time)
     VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,NOW())`,
    [
      tenantId,
      customer.rows[0].name,
      customer.rows[0].phone,
      templateCategory,
      finalMessage,
      ticket.id,
      eventId,
    ]
  );
}
