import type { JSX } from 'react'

export type View = 'overview' | 'settings'

const ITEMS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
]

interface SidebarProps {
  view: View
  onSelect: (view: View) => void
}

export function Sidebar({ view, onSelect }: SidebarProps): JSX.Element {
  return (
    <nav className="sidebar" aria-label="Main">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === view ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
          aria-current={item.id === view ? 'page' : undefined}
          onClick={() => {
            onSelect(item.id)
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
