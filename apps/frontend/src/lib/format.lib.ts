export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;

  const [username, domain] = email.split("@");
  if (!username || !domain) return email;

  if (username.length <= 2) {
    return `${username[0]}•••@${domain}`;
  }

  if (username.length <= 4) {
    return `${username[0]}••••${username.slice(-1)}@${domain}`;
  }

  const start = username.slice(0, 2);
  const end = username.slice(-2);
  return `${start}••••••${end}@${domain}`;
};
