// stores/attendance.store.ts
import { defineStore } from "pinia"
import type { Attendance } from "../types"
import { markAttendance, listAttendance, updateAttendance } from "../repo/attendance"
import { toJsDate } from "../../lib/utils"

export const useAttendanceStore = defineStore("attendance", {
  state: () => ({
    attendance: [] as Attendance[],
    error: null as string | null,
    loading: false,
  }),

  getters: {
    attendanceList: (s) => s.attendance,

    getClientAttendance: (s) => (clientId: string) =>
      s.attendance.filter(a => a.clientId === clientId),

    getTodayAttendance: (s) => () => {
      const d2 = new Date()
      return s.attendance.filter(a => {
        const d1 = toJsDate(a.date)
        if (!d1) return false
        return d1.getFullYear() === d2.getFullYear()
          && d1.getMonth() === d2.getMonth()
          && d1.getDate() === d2.getDate()
          && a.attended
      })
    },

    getWeeklyAttendanceRate: (s) => (clientId: string) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const weekAttendance = s.attendance.filter(a => {
        const d = toJsDate(a.date)
        return a.clientId === clientId && !!d && d >= weekAgo
      })

      if (weekAttendance.length === 0) return 0
      const attended = weekAttendance.filter(a => a.attended).length
      return Math.round((attended / weekAttendance.length) * 100)
    }
  },

  actions: {
    async loadAttendance() {
      this.loading = true
      this.error = null
      try {
        this.attendance = await listAttendance()
      } catch (e: any) {
        this.error = e?.message ?? "Error loading attendance"
        throw e
      } finally {
        this.loading = false
      }
    },

    // optimista + rollback
    async markAttendance(clientId: string, attended: boolean, notes?: string) {
      const today = new Date()
      const existing = this.attendance.find(a => {
        const d = toJsDate(a.date)
        return a.clientId === clientId && !!d && d.toDateString() === today.toDateString()
      })

      if (existing) {
        const prev = { ...existing }
        existing.attended = attended
        existing.notes = notes

        try {
          await updateAttendance(existing.id!, existing)
        } catch (e) {
          Object.assign(existing, prev)
          throw e
        }
        return
      }

      const attendanceRecord: Attendance = {
        clientId,
        date: today,
        attended,
        notes: notes ?? "",
      }

      // optimista
      this.attendance.push(attendanceRecord)
      try {
        await markAttendance(attendanceRecord)
      } catch (e) {
        // rollback
        this.attendance = this.attendance.filter(a => a !== attendanceRecord)
        throw e
      }
    }
  }
})
