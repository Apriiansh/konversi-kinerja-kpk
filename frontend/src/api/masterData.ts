import { api } from './client'

export async function getMasterData() {
  const res = await api.get('/master-data')
  return res.data
}
