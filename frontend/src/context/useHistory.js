import { useContext } from 'react'
import { HistoryContext } from './historyContext.js'

export function useHistory() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider')
  return ctx
}
