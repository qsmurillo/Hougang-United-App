import './ClubCrest.css'

interface ClubCrestProps {
  large?: boolean
}

export function ClubCrest({ large = false }: ClubCrestProps) {
  return (
    <div aria-hidden="true" className={`brand-mark club-crest${large ? ' large' : ''}`}>
      <img src="/hougang-united-crest.webp" alt="" />
    </div>
  )
}
