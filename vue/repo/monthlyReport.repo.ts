import { getToken } from '../api'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface SavedReport {
  id: string
  client_id: string
  month: string
  pdf_url: string | null
  generated_at: string
  generated_by: string
}

async function downloadReport(clientId: string, month: string, clientName: string, asClient = false): Promise<void> {
  const token = getToken()
  const path = asClient
    ? `/clients/${clientId}/monthly-report/download?month=${month}`
    : `/clients/${clientId}/monthly-report?month=${month}`
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (res.status === 401) {
    window.location.href = '/#/auth/login'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail ?? `Error ${res.status}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = clientName.toLowerCase().replace(/\s+/g, '_')
  a.download = `report_${safeName}_${month}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

async function listReports(clientId: string): Promise<SavedReport[]> {
  const token = getToken()
  const res = await fetch(
    `${BASE_URL}/clients/${clientId}/monthly-reports`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  )
  if (!res.ok) return []
  return res.json()
}

export const monthlyReportRepo = { downloadReport, listReports }
