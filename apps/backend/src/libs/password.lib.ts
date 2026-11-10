import crypto from "node:crypto";

/**
 * Generates an unambiguous, cryptographically secure temporary password
 * that strictly satisfies ChangePasswordSchema and will never break HTML emails.
 */
export function generateSecureTemporaryPassword(length = 12): string {
  const minLength = Math.max(8, length);

  // Unambiguous character pools (no 0/O, no 1/l/I)
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No 'I', 'O'
  const lowercase = "abcdefghijkmnopqrstuvwxyz"; // No 'l'
  const numbers = "23456789"; // No '0', '1'
  const safeSymbols = "!@#$%*_-"; // Strictly matches /[!@#$%^&*_-]/ without HTML conflicts

  const allChars = uppercase + lowercase + numbers + safeSymbols;

  // Guarantee at least one of each required character category
  const passwordArray: string[] = [
    uppercase[crypto.randomInt(0, uppercase.length)]!,
    lowercase[crypto.randomInt(0, lowercase.length)]!,
    numbers[crypto.randomInt(0, numbers.length)]!,
    safeSymbols[crypto.randomInt(0, safeSymbols.length)]!,
  ];

  // Fill remaining slots
  for (let i = passwordArray.length; i < minLength; i++) {
    passwordArray.push(allChars[crypto.randomInt(0, allChars.length)]!);
  }

  // Fisher-Yates cryptographically secure shuffle
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = passwordArray[i]!;
    passwordArray[i] = passwordArray[j]!;
    passwordArray[j] = temp;
  }

  return passwordArray.join("");
}
