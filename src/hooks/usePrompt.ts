import { useCallback } from "react";

/**
 * Minimal prompt hook. Falls back to the native window.prompt so callers that
 * expect a `showPrompt` function keep working without a heavy modal dependency.
 */
export function usePrompt() {
  const showPrompt = useCallback((message: string, _default?: string): string | null => {
    return window.prompt(message, _default);
  }, []);
  return { showPrompt };
}
