export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const nationalityFlags: Record<string, string> = {
  SGP: '🇸🇬',
  SINGAPORE: '🇸🇬',
  JPN: '🇯🇵',
  JAPAN: '🇯🇵',
  GBR: '🇬🇧',
  THA: '🇹🇭',
  FRA: '🇫🇷',
  ECU: '🇪🇨',
  BEL: '🇧🇪',
  MNE: '🇲🇪',
  CHN: '🇨🇳',
  MAS: '🇲🇾',
  MYS: '🇲🇾',
  MALAYSIA: '🇲🇾',
  BRA: '🇧🇷',
  AUS: '🇦🇺',
}

export function nationalityFlag(nationality: string): string {
  return nationalityFlags[nationality.trim().toUpperCase()] ?? '🌐'
}
