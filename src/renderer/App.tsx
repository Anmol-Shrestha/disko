import { useState, type JSX } from 'react'
import { Sidebar, type View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Chat } from './panels/Chat'
import { Dashboard } from './panels/Dashboard'
import { Settings } from './panels/Settings'
import { Terminal } from './panels/Terminal'

export function App(): JSX.Element {
  const [view, setView] = useState<View>('overview')

  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        <Sidebar view={view} onSelect={setView} />
        <main className="main">
          {view === 'overview' ? (
            <>
              <Dashboard />
              <div className="split">
                <Chat />
                <Terminal />
              </div>
            </>
          ) : (
            <Settings />
          )}
        </main>
      </div>
    </div>
  )
}
