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

export const getSemesterStatus = (startDate: string, endDate: string) => {
  const today = new Date().toISOString().slice(0, 10);
  if (today >= startDate && today <= endDate)
    return {
      label: "Ongoing",
      variant: "default" as const,
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  if (today < startDate)
    return {
      label: "Upcoming",
      variant: "secondary" as const,
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  return {
    label: "Concluded",
    variant: "outline" as const,
    color: "bg-muted text-muted-foreground border-border",
  };
};
