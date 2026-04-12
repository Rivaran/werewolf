"use client"

import { useEffect, useRef } from "react"

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>
  }
}

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    let disposed = false

    async function acquire() {
      const nav = navigator as WakeLockNavigator
      if (!nav.wakeLock || document.visibilityState !== "visible") return

      try {
        sentinelRef.current = await nav.wakeLock.request("screen")
        sentinelRef.current.addEventListener("release", () => {
          if (!disposed) {
            sentinelRef.current = null
          }
        })
      } catch {
        sentinelRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (sentinelRef.current && !sentinelRef.current.released) {
        void sentinelRef.current.release()
      }
      sentinelRef.current = null
    }
  }, [enabled])
}
