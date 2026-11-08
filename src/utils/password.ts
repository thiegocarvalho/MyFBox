/** Força aproximada de uma senha mestra (0–4) com rótulo em português. */
export function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 6) score = 0;
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { score, label: labels[score] };
}
