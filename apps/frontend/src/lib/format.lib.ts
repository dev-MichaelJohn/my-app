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
      color: "bg-primary/15 text-primary border-primary/20",
    };
  if (today < startDate)
    return {
      label: "Upcoming",
      variant: "secondary" as const,
      color: "bg-chart-2/15 text-chart-2 border-chart-2/20",
    };
  return {
    label: "Concluded",
    variant: "outline" as const,
    color: "bg-muted text-muted-foreground border-border",
  };
};
