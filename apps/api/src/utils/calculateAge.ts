export default function calculateAge(
  birthDate: string,
  endDate?: string,
): number {
  const start = new Date(birthDate);
  const end = endDate ? new Date(endDate) : new Date();

  let age = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}
