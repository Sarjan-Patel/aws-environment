"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PolicyDropdown, PolicyBadge } from "./PolicyDropdown"
import { LockIcon, ProductionBadge } from "@/components/shared/LockedIndicator"
import { ChevronLeft, ChevronRight, Search, Filter, Loader2 } from "lucide-react"
import { usePolicyResources, getResourceTypeShort, PolicyResource } from "@/hooks/usePolicyResources"
import { usePolicyUpdate } from "@/hooks/usePolicyUpdate"
import type { OptimizationPolicy, ResourceType } from "@/lib/utils/policyLock"

const ITEMS_PER_PAGE = 15

interface PolicyTableProps {
  selectedResources: PolicyResource[]
  onSelectionChange: (resources: PolicyResource[]) => void
}

export function PolicyTable({ selectedResources, onSelectionChange }: PolicyTableProps) {
  const { data: resources, isLoading, error } = usePolicyResources()
  const policyUpdate = usePolicyUpdate()

  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [envFilter, setEnvFilter] = useState<string>("all")
  const [policyFilter, setPolicyFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Get unique values for filters
  const resourceTypes = useMemo(() => {
    if (!resources) return []
    const types = new Set(resources.map((r) => r.type))
    return Array.from(types).sort()
  }, [resources])

  const environments = useMemo(() => {
    if (!resources) return []
    const envs = new Set(resources.map((r) => r.env).filter(Boolean))
    return Array.from(envs).sort() as string[]
  }, [resources])

  // Filter resources
  const filteredResources = useMemo(() => {
    if (!resources) return []

    return resources.filter((r) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !r.name.toLowerCase().includes(query) &&
          !r.id.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Type filter
      if (typeFilter !== "all" && r.type !== typeFilter) {
        return false
      }

      // Environment filter
      if (envFilter !== "all") {
        if (envFilter === "none" && r.env !== null) return false
        if (envFilter !== "none" && r.env !== envFilter) return false
      }

      // Policy filter
      if (policyFilter !== "all" && r.optimization_policy !== policyFilter) {
        return false
      }

      return true
    })
  }, [resources, searchQuery, typeFilter, envFilter, policyFilter])

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / ITEMS_PER_PAGE)
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Selection handlers
  const isSelected = (resource: PolicyResource) =>
    selectedResources.some((r) => r.id === resource.id)

  const toggleSelection = (resource: PolicyResource) => {
    if (isSelected(resource)) {
      onSelectionChange(selectedResources.filter((r) => r.id !== resource.id))
    } else {
      onSelectionChange([...selectedResources, resource])
    }
  }

  const toggleAllOnPage = () => {
    const allOnPageSelected = paginatedResources.every(isSelected)
    if (allOnPageSelected) {
      // Deselect all on page
      const pageIds = new Set(paginatedResources.map((r) => r.id))
      onSelectionChange(selectedResources.filter((r) => !pageIds.has(r.id)))
    } else {
      // Select all on page
      const existing = new Set(selectedResources.map((r) => r.id))
      const toAdd = paginatedResources.filter((r) => !existing.has(r.id))
      onSelectionChange([...selectedResources, ...toAdd])
    }
  }

  const selectAllFiltered = () => {
    onSelectionChange(filteredResources)
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  // Policy update handler
  const handlePolicyChange = (resourceId: string, newPolicy: OptimizationPolicy) => {
    const resource = resources?.find((r) => r.id === resourceId)
    if (!resource) return

    policyUpdate.mutate({
      resourceId,
      resourceType: resource.type,
      newPolicy,
      env: resource.env,
      optimization_policy_locked: resource.optimization_policy_locked,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive font-medium">Failed to load resources</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 w-full"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <Filter className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {getResourceTypeShort(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={envFilter} onValueChange={(v) => { setEnvFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Envs</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env} value={env}>
                {env}
              </SelectItem>
            ))}
            <SelectItem value="none">No Env</SelectItem>
          </SelectContent>
        </Select>

        <Select value={policyFilter} onValueChange={(v) => { setPolicyFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Policies</SelectItem>
            <SelectItem value="auto_safe">Auto-Safe</SelectItem>
            <SelectItem value="recommend_only">Recommend Only</SelectItem>
            <SelectItem value="ignore">Ignore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection summary */}
      {selectedResources.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/50 px-4 py-2 rounded-lg">
          <span className="text-sm">
            <strong>{selectedResources.length}</strong> resource{selectedResources.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2 flex-wrap">
            {selectedResources.length < filteredResources.length && (
              <Button variant="ghost" size="sm" onClick={selectAllFiltered} className="whitespace-nowrap">
                Select all {filteredResources.length}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    paginatedResources.length > 0 &&
                    paginatedResources.every(isSelected)
                  }
                  onCheckedChange={toggleAllOnPage}
                />
              </TableHead>
              <TableHead className="min-w-[220px]">Resource</TableHead>
              <TableHead className="w-20 text-center">Type</TableHead>
              <TableHead className="w-24 text-center">Env</TableHead>
              <TableHead className="w-[180px]">Policy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No resources found
                </TableCell>
              </TableRow>
            ) : (
              paginatedResources.map((resource) => (
                <TableRow key={resource.id} className="group">
                  <TableCell className="w-12">
                    <Checkbox
                      checked={isSelected(resource)}
                      onCheckedChange={() => toggleSelection(resource)}
                    />
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0">
                        <LockIcon resource={resource} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{resource.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {resource.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center w-20">
                    <Badge variant="outline" className="text-xs">
                      {getResourceTypeShort(resource.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center w-24">
                    {resource.env === "prod" ? (
                      <ProductionBadge env={resource.env} />
                    ) : resource.env ? (
                      <Badge variant="secondary" className="text-xs">
                        {resource.env}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <PolicyDropdown
                      resource={resource}
                      onPolicyChange={handlePolicyChange}
                      disabled={policyUpdate.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredResources.length)} of{" "}
            {filteredResources.length} resources
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
