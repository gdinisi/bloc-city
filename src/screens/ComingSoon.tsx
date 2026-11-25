interface Props {
  emoji: string
  title: string
  lines: string[]
}

export function ComingSoon({ emoji, title, lines }: Props) {
  return (
    <div className="screen">
      <section className="card soon">
        <div className="soon-emoji">{emoji}</div>
        <h2>{title}</h2>
        <p className="muted">Arrive dans une prochaine étape :</p>
        <ul>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
