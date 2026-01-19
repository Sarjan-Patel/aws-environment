"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase/connection"

export type ExecutionMode = "manual" | "automated"

const LOCAL_STORAGE_KEY = "auto_safe_execution_mode"

// Debug logger
const debug = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12)
  if (data !== undefined) {
    console.log(`[${timestamp}] [useExecutionMode] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [useExecutionMode] ${message}`)
  }
}

/**
 * Hook to manage the Auto-Safe execution mode.
 * In "manual" mode, user must click to execute actions.
 * In "automated" mode, actions are auto-executed when drift-tick runs.
 *
 * Uses localStorage for immediate state and syncs to database when connected.
 */
export function useExecutionMode() {
  const queryClient = useQueryClient()

  // Track if component is mounted (for hydration safety)
  const [isMounted, setIsMounted] = useState(false)

  // Local state for immediate UI feedback - start with default to avoid hydration mismatch
  const [localMode, setLocalMode] = useState<ExecutionMode>("manual")

  // Track previous mode to detect changes
  const previousModeRef = useRef<ExecutionMode | null>(null)

  // Read from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    debug("Component mounting, reading from localStorage...")
    setIsMounted(true)
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    debug("localStorage value:", stored)
    if (stored === "automated" || stored === "manual") {
      debug(`Setting localMode from localStorage: ${stored}`)
      setLocalMode(stored)
      previousModeRef.current = stored
    } else {
      debug("No valid localStorage value, using default: manual")
      previousModeRef.current = "manual"
    }
  }, [])

  // Sync from database on mount
  const { data: dbMode, isLoading, error: dbError } = useQuery<ExecutionMode>({
    queryKey: ["execution-mode"],
    queryFn: async () => {
      debug("Fetching execution mode from database...")
      const supabase = getSupabaseClient()
      if (!supabase) {
        debug("No Supabase client, using localStorage value")
        return localMode
      }

      try {
        const { data, error } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "execution_settings")
          .single()

        if (error) {
          debug("DB query error:", error.message)
          // If table doesn't exist, try to create default
          if (error.code === "PGRST116" || error.code === "42P01") {
            debug("Settings table or row not found, will use localStorage")
          }
          return localMode
        }

        if (!data?.value?.mode) {
          debug("No mode in DB response, using localStorage")
          return localMode
        }

        const mode = data.value.mode as ExecutionMode
        debug(`DB returned mode: ${mode}`)
        // Sync localStorage with DB
        localStorage.setItem(LOCAL_STORAGE_KEY, mode)
        return mode
      } catch (e) {
        debug("DB fetch exception:", e)
        return localMode
      }
    },
    staleTime: 60000,
    retry: false,
    enabled: isMounted, // Only run after mount
  })

  // Update local state when DB loads
  useEffect(() => {
    if (dbMode && dbMode !== localMode) {
      debug(`DB mode (${dbMode}) differs from local (${localMode}), updating local`)
      setLocalMode(dbMode)
    }
  }, [dbMode, localMode])

  // Mutation to update mode
  const updateMutation = useMutation<
    { newMode: ExecutionMode; previousMode: ExecutionMode },
    Error,
    ExecutionMode
  >({
    mutationFn: async (newMode) => {
      const previousMode = localMode
      debug(`========== MODE CHANGE ==========`)
      debug(`Previous mode: ${previousMode}`)
      debug(`New mode: ${newMode}`)

      // Always update localStorage first for immediate feedback
      localStorage.setItem(LOCAL_STORAGE_KEY, newMode)
      debug("localStorage updated")
      setLocalMode(newMode)
      debug("localMode state updated")

      // Try to sync to database
      const supabase = getSupabaseClient()
      if (supabase) {
        debug("Syncing to database...")
        try {
          const { error } = await supabase
            .from("settings")
            .upsert(
              {
                key: "execution_settings",
                value: { mode: newMode, updated_at: new Date().toISOString() }
              },
              { onConflict: "key" }
            )

          if (error) {
            debug("DB sync FAILED:", error.message)
            console.warn("[useExecutionMode] DB sync failed:", error.message)
          } else {
            debug("DB sync SUCCESS")
          }
        } catch (e) {
          debug("DB sync EXCEPTION:", e)
          console.warn("[useExecutionMode] DB sync error:", e)
        }
      } else {
        debug("No Supabase client, skipping DB sync")
      }

      debug(`========== MODE CHANGE COMPLETE ==========`)
      return { newMode, previousMode }
    },
    onSuccess: (result) => {
      debug("Mutation onSuccess, invalidating queries")
      queryClient.invalidateQueries({ queryKey: ["execution-mode"] })

      // Return the result so the caller knows what changed
      return result
    },
  })

  // Enhanced setMode that returns the mutation result
  const setMode = useCallback((newMode: ExecutionMode) => {
    debug(`setMode called with: ${newMode}`)
    return updateMutation.mutateAsync(newMode)
  }, [updateMutation])

  const toggleMode = useCallback(() => {
    const newMode = localMode === "manual" ? "automated" : "manual"
    debug(`toggleMode: ${localMode} -> ${newMode}`)
    return setMode(newMode)
  }, [localMode, setMode])

  // Log state changes
  useEffect(() => {
    if (isMounted) {
      debug(`Current state: mode=${localMode}, isMounted=${isMounted}, isLoading=${isLoading}`)
    }
  }, [localMode, isMounted, isLoading])

  return {
    mode: localMode,
    isLoading: isLoading || !isMounted,
    isMounted,
    isAutomated: localMode === "automated",
    isManual: localMode === "manual",
    setMode,
    toggleMode,
    isUpdating: updateMutation.isPending,
    dbError,
  }
}
