"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, Loader2 } from "lucide-react"
import { useConnectionStore } from "@/stores/connection-store"
import { getSupabaseClient } from "@/lib/supabase/connection"

interface Organization {
  id: string
  name: string
  slug: string
}

export function OrgSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const fetchingRef = useRef(false)
  const { orgId, setOrgContext, isConnected } = useConnectionStore()

  // Derive selected org from store's orgId and fetched organizations
  const selectedOrg = organizations.find((o) => o.id === orgId) || null

  const fetchOrganizations = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return
    fetchingRef.current = true
    setIsLoading(true)

    const client = getSupabaseClient()
    if (!client) {
      setIsLoading(false)
      fetchingRef.current = false
      return
    }

    try {
      // Check for active auth session (works with OTP/magic link)
      const { data: { session } } = await client.auth.getSession()
      let currentUserId: string | undefined = session?.user?.id

      // Fallback to getUser() if no session (handles refresh)
      if (!currentUserId) {
        const { data: { user } } = await client.auth.getUser()
        currentUserId = user?.id
      }

      let orgsData: Organization[] = []

      if (currentUserId) {
        // User is authenticated - fetch organizations they're a member of
        const { data: memberships, error: membershipsError } = await client
          .from("organization_members")
          .select("org_id")
          .eq("user_id", currentUserId)

        if (!membershipsError && memberships && memberships.length > 0) {
          const orgIds = memberships.map((m: any) => m.org_id)
          const { data, error } = await client
            .from("organizations")
            .select("id, name, slug")
            .in("id", orgIds)
            .order("name")

          if (!error && data) {
            orgsData = data
          }
        }
      }

      // Fallback: try fetching all orgs (will be filtered by RLS if policies exist)
      if (orgsData.length === 0) {
        const { data: allOrgs, error: allOrgsError } = await client
          .from("organizations")
          .select("id, name, slug")
          .order("name")

        if (!allOrgsError && allOrgs) {
          orgsData = allOrgs
        }
      }

      setOrganizations(orgsData)
      setHasFetched(true)

      // Auto-select first org if none is set and we have orgs
      if (orgsData.length > 0 && !orgId) {
        setOrgContext(orgsData[0].id)
      }
      // If orgId is set but doesn't exist in the list, select the first one
      else if (orgId && orgsData.length > 0 && !orgsData.find((o) => o.id === orgId)) {
        setOrgContext(orgsData[0].id)
      }
    } catch (error) {
      console.error("Error in fetchOrganizations:", error)
      setOrganizations([])
      setHasFetched(true)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [orgId, setOrgContext])

  useEffect(() => {
    if (!isConnected) {
      setIsLoading(false)
      return
    }

    // Only fetch if we haven't fetched yet
    if (!hasFetched) {
      fetchOrganizations()
    }
  }, [isConnected, hasFetched, fetchOrganizations])

  const handleSelectOrg = (org: Organization) => {
    // Update store (this will persist to localStorage)
    setOrgContext(org.id, null) // Reset account when org changes
  }

  // Show loading state instead of returning null
  if (isLoading && !hasFetched) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="max-w-[150px] truncate">Loading...</span>
      </Button>
    )
  }

  // Only hide if we've fetched and there are no orgs
  if (hasFetched && organizations.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {selectedOrg?.name || "Select Organization"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSelectOrg(org)}
            className={org.id === orgId ? "bg-accent" : ""}
          >
            <Building2 className="h-4 w-4 mr-2" />
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
