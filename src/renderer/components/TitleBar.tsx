import { useEffect, useState, type JSX } from 'react'

/** Our own title bar. Its left padding leaves room for the macOS traffic lights. */
export function TitleBar(): JSX.Element {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api
      .appInfo()
      .then((info) => {
        if (!cancelled) setVersion(info.version)
      })
      .catch(() => {
        if (!cancelled) setVersion(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <header className="titlebar">
      <span className="titlebar__name">DiskPilot</span>
      {version && <span className="titlebar__meta">v{version}</span>}
    </header>
  )
}
