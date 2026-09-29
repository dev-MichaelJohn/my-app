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

export const isSemesterOpen = (
  semester?: { start_date: string; end_date: string } | null,
): boolean => {
  if (!semester) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today <= semester.end_date;
};

export const getScheduleWindowStatus = (openAt: string | Date, closeAt: string | Date) => {
  const now = new Date();
  const openDate = new Date(openAt);
  const closeDate = new Date(closeAt);

  if (now >= openDate && now <= closeDate) {
    return {
      label: "Open for Submissions",
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (now < openDate) {
    return {
      label: "Scheduled / Upcoming",
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  return { label: "Closed / Concluded", color: "bg-muted text-muted-foreground border-border" };
};

export function getDynamicRatingDescriptor(score: number, min: number, max: number): string {
  // Standard 5-point scale
  if (min === 1 && max === 5) {
    const scale5Map: Record<number, string> = {
      1: "Poor / Needs Improvement",
      2: "Fair / Basic Compliance",
      3: "Satisfactory / Proficient",
      4: "Very Satisfactory / High Quality",
      5: "Outstanding / Exceptional",
    };
    return scale5Map[score] || `Score: ${score}`;
  }

  // Standard 4-point scale
  if (min === 1 && max === 4) {
    const scale4Map: Record<number, string> = {
      1: "Unsatisfactory / Poor",
      2: "Developing / Fair",
      3: "Proficient / Satisfactory",
      4: "Exemplary / Outstanding",
    };
    return scale4Map[score] || `Score: ${score}`;
  }

  // Dynamic interpolation for any custom range (e.g. 1–10, 1–7)
  const range = max - min;
  if (range <= 0) return `Score: ${score}`;
  const ratio = (score - min) / range;

  if (ratio === 0) return "Lowest / Unsatisfactory";
  if (ratio <= 0.25) return "Below Average / Basic";
  if (ratio <= 0.5) return "Average / Moderate";
  if (ratio <= 0.75) return "Above Average / Proficient";
  if (ratio < 1.0) return "High / Very Satisfactory";
  return "Highest / Exceptional";
}
