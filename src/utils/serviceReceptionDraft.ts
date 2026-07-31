export function sanitizeServiceReceptionDraft(draft: Record<string, unknown>) {
  const { newSrvScreenLock: _screenLock, newSrvCapturedConditions: _photos, ...safeDraft } = draft;
  return { ...safeDraft, newSrvCapturedConditions: [] };
}
