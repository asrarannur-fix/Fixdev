export function sanitizeServiceReceptionDraft(draft: Record<string, unknown>) {
  const { newSrvScreenLock: _screenLock, ...safeDraft } = draft;
  return safeDraft;
}
