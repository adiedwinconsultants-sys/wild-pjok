export function nowIso(): string {
  return new Date().toISOString()
}

export function addSecondsIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ageAt(birthDate: string, at: string): number {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const target = new Date(`${at}T00:00:00Z`)
  let age = target.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = target.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && target.getUTCDate() < birth.getUTCDate())) {
    age -= 1
  }
  return age
}
