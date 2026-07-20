import { createContext } from 'react'
import { API_URL } from '../lib/media'

export const HistoryContext = createContext(null)

// Single source of truth lives in lib/media (API_URL); re-exported here under
// the name the history layer already uses.
export const HISTORY_API_URL = API_URL

// Download history now lives in Postgres, scoped to the logged-in user (0XC-100)
// — these two keys are the OLD browser-local store. They're kept only so the
// provider can clear the stale copy off returning visitors' machines; nothing
// reads them.
export const LEGACY_HISTORY_KEYS = ['tubekeepHistory', 'tubekeepExpired']
