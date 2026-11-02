// The audit as JSON. Main builds it, the dashboard renders it, and Claude receives
// it as context. audit.txt is the same data in text form.

/** 1 = safe cache (rebuilds itself), 2 = review per item, 3 = report only. */
export type Tier = 1 | 2 | 3 | 'unknown'

export type Recommended = 'remove' | 'keep' | 'review'

export interface Safety {
  tier: Tier
  reason: string
  recommended: Recommended
}

/** One section of audit.txt, in the order the dashboard shows them. */
export type SectionId =
  'knownSpaceHogs' | 'libraryTop' | 'applicationSupportTop' | 'cachesTop' | 'dotFolders' | 'nodeModules' | 'pythonVenvs'

export const SECTION_ORDER: readonly SectionId[] = [
  'knownSpaceHogs',
  'libraryTop',
  'applicationSupportTop',
  'cachesTop',
  'dotFolders',
  'nodeModules',
  'pythonVenvs',
]

export const SECTION_TITLES: Record<SectionId, string> = {
  knownSpaceHogs: 'Known space hogs',
  libraryTop: 'Top folders in ~/Library',
  applicationSupportTop: 'Top in ~/Library/Application Support',
  cachesTop: 'Top in ~/Library/Caches',
  dotFolders: 'Hidden dot-folders in home',
  nodeModules: 'node_modules folders',
  pythonVenvs: 'Python venvs (.venv / venv)',
}

/** The four answers, for one folder. */
export interface AuditItem {
  section: SectionId
  /** What it is: a name, e.g. "uv cache" or "Folder name" when unknown. */
  what: string
  /** Category, e.g. "Package caches". */
  category: string
  /** Where it is: full path. */
  path: string
  /** How much: exact bytes when known. */
  bytes: number
  /** Is it safe to delete. */
  safety: Safety
}

export interface DiskInfo {
  device: string
  mount: string
  totalBytes: number
  usedBytes: number
  freeBytes: number
  capacityPercent: number
}

export interface LocalSnapshot {
  name: string
  /** A pending macOS update snapshot means "install the macOS update". */
  pendingMacOSUpdate: boolean
}

export interface AuditSnapshot {
  /** The home folder the paths were measured under, e.g. /Users/you. */
  home: string
  disk: DiskInfo
  localSnapshots: LocalSnapshot[]
  /** Flat list. Each item says which section it belongs to. */
  items: AuditItem[]
}
