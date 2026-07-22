export type PasswordPolicy = {
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
};

export function passwordPolicyError(password: string, policy: PasswordPolicy = {}): string | null {
  const minLength = Math.min(32, Math.max(6, Number(policy.minPasswordLength) || 8));
  if (password.length < minLength) return `Password minimal ${minLength} karakter.`;
  if (policy.requireUppercase && !/[A-Z]/.test(password)) return "Password wajib memiliki huruf besar.";
  if (policy.requireNumber && !/\d/.test(password)) return "Password wajib memiliki angka.";
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) return "Password wajib memiliki simbol.";
  return null;
}
