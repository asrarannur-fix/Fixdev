// Render template pesan WhatsApp milik tenant.
// Dipindah dari ServicesTab agar bisa dipakai ulang oleh sub-komponen
// (WhatsAppHub, dsb) tanpa mengandalkan closure parent.

type WaTemplate = { category?: string; content?: string };

export function renderTenantWaTemplate(
  templates: WaTemplate[] | undefined,
  category: string,
  ctx: Record<string, any>,
): string | null {
  if (!Array.isArray(templates)) return null;
  const match = templates.find(
    (t: WaTemplate) => t.category === category && t.content,
  );
  if (!match) return null;
  return (match.content as string).replace(/\{(\w+)\}/g, (_, key) => {
    if (key in ctx && ctx[key] !== undefined && ctx[key] !== null) {
      return String(ctx[key]);
    }
    return `{${key}}`;
  });
}
