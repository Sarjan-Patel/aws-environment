"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cloud, ChevronDown, Plus, Loader2 } from "lucide-react"
import { useConnectionStore } from "@/stores/connection-store"
import { getSupabaseClient } from "@/lib/supabase/connection"

interface CloudAccount {
  id: string
  name: string
  provider: string
}

export function AccountSelector() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountProvider, setNewAccountProvider] = useState("aws")
  const fetchingRef = useRef(false)
  const lastOrgIdRef = useRef<string | null>(null)
  const { orgId, accountId, setOrgContext, isConnected } = useConnectionStore()

  // Derive selected account from store's accountId and fetched accounts
  const selectedAccount = accountId ? accounts.find((a) => a.id === accountId) || null : null

  const fetchAccounts = useCallback(async (forOrgId: string) => {
    // Prevent concurrent fetches for the same org
    if (fetchingRef.current && lastOrgIdRef.current === forOrgId) {
      return
    }
    fetchingRef.current = true
    lastOrgIdRef.current = forOrgId
    setIsLoading(true)

    const client = getSupabaseClient()
    if (!client) {
      setIsLoading(false)
      fetchingRef.current = false
      return
    }

    try {
      const { data, error } = await client
        .from("cloud_accounts")
        .select("id, name, provider")
        .eq("org_id", forOrgId)
        .order("name")

      if (!error && data) {
        setAccounts(data)

        // If current accountId doesn't exist in the new accounts list, reset it
        if (accountId && !data.find((a) => a.id === accountId)) {
          setOrgContext(forOrgId, null)
        }
      } else {
        setAccounts([])
      }
    } catch (error) {
      console.error("[AccountSelector] Error fetching accounts:", error)
      setAccounts([])
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [accountId, setOrgContext])

  useEffect(() => {
    if (!isConnected) {
      setIsLoading(false)
      return
    }

    if (!orgId) {
      setAccounts([])
      setIsLoading(false)
      return
    }

    // Refetch when orgId changes
    if (lastOrgIdRef.current !== orgId) {
      fetchAccounts(orgId)
    }
  }, [isConnected, orgId, fetchAccounts])

  const handleSelectAccount = (account: CloudAccount | null) => {
    if (!orgId) return
    // Update store (this will persist to localStorage)
    setOrgContext(orgId, account?.id || null)
  }

  async function handleCreateAccount() {
    if (!newAccountName.trim() || !orgId) return

    setCreatingAccount(true)
    const client = getSupabaseClient()
    if (!client) {
      setCreatingAccount(false)
      return
    }

    try {
      const { data: account, error } = await client
        .from("cloud_accounts")
        .insert({
          name: newAccountName.trim(),
          provider: newAccountProvider,
          org_id: orgId,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating account:", error)
        alert("Failed to create account. Please try again.")
        return
      }

      setNewAccountName("")
      // Refresh accounts list
      const { data: updatedAccounts } = await client
        .from("cloud_accounts")
        .select("id, name, provider")
        .eq("org_id", orgId)
        .order("name")

      if (updatedAccounts) {
        setAccounts(updatedAccounts)
        setOrgContext(orgId, account.id)
      }
    } catch (error) {
      console.error("Error creating account:", error)
      alert("Failed to create account. Please try again.")
    } finally {
      setCreatingAccount(false)
    }
  }

  // Show loading state instead of returning null when org changes
  if (!orgId) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Cloud className="h-4 w-4" />
        <span className="max-w-[150px] truncate">Select Org First</span>
      </Button>
    )
  }

  if (isLoading && accounts.length === 0) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="max-w-[150px] truncate">Loading...</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Cloud className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {selectedAccount?.name || "Select Account"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {accounts.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No accounts yet
          </div>
        ) : (
          accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => handleSelectAccount(account)}
              className={account.id === accountId ? "bg-accent" : ""}
            >
              <Cloud className="h-4 w-4 mr-2" />
              {account.name}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Account
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cloud Account</DialogTitle>
              <DialogDescription>
                Add a new cloud account to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  placeholder="production"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAccount()
                  }}
                />
              </div>
              <div>
                <Label htmlFor="account-provider">Provider</Label>
                <select
                  id="account-provider"
                  value={newAccountProvider}
                  onChange={(e) => setNewAccountProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="aws">AWS</option>
                  <option value="azure">Azure</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>
              <Button
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim() || creatingAccount}
                className="w-full"
              >
                {creatingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
