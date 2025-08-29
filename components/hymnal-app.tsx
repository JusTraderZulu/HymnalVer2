"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, Plus, WifiOff, Moon, Sun, X, RefreshCcw } from "lucide-react"
import HymnList from "@/components/hymn-list"
import HymnDetail from "@/components/hymn-detail"
import NewHymnDialog from "@/components/new-hymn-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Clock, Music, Info, Mic } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { Hymn } from "@/types/hymn"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import PWAInstallPrompt from "@/components/pwa-install-prompt"
import { db } from "@/lib/db"
import { useTheme } from "next-themes"

// Cache keys
const HYMNS_CACHE_KEY = "cached_hymns";
const CACHE_TIMESTAMP_KEY = "hymns_cache_timestamp";
// Cache expiry in milliseconds (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export default function HymnalApp() {
  const [hymns, setHymns] = useState<Hymn[]>([])
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHymn, setSelectedHymn] = useState<number | string | null>(null)
  const [editHymn, setEditHymn] = useState<number | string | null>(null)
  const [favorites, setFavorites] = useLocalStorage<(number | string)[]>("favorites", [])
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<(number | string)[]>("recentlyViewed", [])
  const [activeTab, setActiveTab] = useState("all")
  const [showDirectoryInfo, setShowDirectoryInfo] = useState(false)
  const [showNewHymnDialog, setShowNewHymnDialog] = useState(false)
  const [newHymnType, setNewHymnType] = useState<'hymn' | 'chorus'>('hymn')
  const { toast } = useToast()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mainRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [fuse, setFuse] = useState<any>(null)

  // Debounced search input to reduce per-keystroke work
  const useDebouncedValue = <T,>(value: T, delayMs: number) => {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delayMs)
      return () => clearTimeout(id)
    }, [value, delayMs])
    return debounced
  }
  const debouncedQuery = useDebouncedValue(searchQuery, 180)

  // Admin UI state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminSecret, setAdminSecret] = useState("")

  // Read-only mode (consumer build)
  const readOnly = process.env.NEXT_PUBLIC_READ_ONLY === 'true'

  // Normalize strings for search: lowercase, strip punctuation, collapse whitespace
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, " ") // replace punctuation with space
      .replace(/\s+/g, " ") // collapse multiple spaces
      .trim()

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // attempt to sync and refresh data on reconnect (background)
      syncLocalEdits();
      fetchHymns({ background: true });
    };
    const handleOffline = () => setIsOffline(true);

    // Set initial status
    setIsOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refetch when window regains focus and we are online
  useEffect(() => {
    const handleFocus = () => {
      if (navigator.onLine) {
        // Background refresh on focus to avoid UI reset
        fetchHymns({ background: true });
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // React to child updates (e.g., after save), clear cache and refetch
  useEffect(() => {
    const onUpdated = () => {
      try {
        localStorage.removeItem(HYMNS_CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      } catch {}
      if (navigator.onLine) {
        fetchHymns();
      }
    };
    window.addEventListener('hymns-updated', onUpdated as any);
    return () => window.removeEventListener('hymns-updated', onUpdated as any);
  }, []);

  // Load hymns from cache if available
  const loadFromCache = (): Hymn[] | null => {
    try {
      const cachedTimestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cachedHymnsStr = localStorage.getItem(HYMNS_CACHE_KEY);
      
      if (!cachedTimestampStr || !cachedHymnsStr) {
        return null;
      }
      
      const cachedTimestamp = parseInt(cachedTimestampStr, 10);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cachedTimestamp > CACHE_EXPIRY) {
        return null;
      }
      
      const cachedHymns = JSON.parse(cachedHymnsStr) as Hymn[];
      return cachedHymns;
    } catch (error) {
      console.error("Error loading from cache:", error);
      return null;
    }
  };

  // Attempt to push any locally edited hymns when we come back online
  const syncLocalEdits = async () => {
    try {
      if (readOnly) return
      const local = await db.hymns.toArray()
      const edited = local.filter(h => h.pendingSync)
      if (edited.length === 0) return
      for (const h of edited) {
        try {
          const res = await fetch(`/api/hymns/${h.hymnNumber}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: h.title,
              lyrics: h.lyrics,
              category: h.category || "",
              author: h.author || { name: "" },
            }),
          })
          if (res.ok) {
            await db.hymns.put({ ...h, pendingSync: false })
          }
        } catch {
          // stay pending
        }
      }
      // Sync pending deletes
      try {
        const pendingDel = await (db as any).pendingDeletes?.toArray?.()
        if (pendingDel && pendingDel.length > 0) {
          for (const d of pendingDel) {
            try {
              await fetch(`/api/hymns/${d.hymnNumber}`, { method: "DELETE" })
              await (db as any).pendingDeletes.delete(d.hymnNumber)
            } catch {}
          }
        }
      } catch {}
    } catch (e) {
      console.error("Sync error", e)
    }
  }

  // Save hymns to cache
  const saveToCache = (hymnsData: Hymn[]) => {
    try {
      localStorage.setItem(HYMNS_CACHE_KEY, JSON.stringify(hymnsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  // Fetch hymns from the API
  const fetchHymns = async ({ background = false }: { background?: boolean } = {}) => {
    try {
      if (!background) setLoading(true);
      
      // First check cache
      const cachedHymns = loadFromCache();
      
      // If offline and we have cached data, use it
      if (isOffline) {
        if (cachedHymns) {
          setHymns(cachedHymns);
          if (!background) {
            toast({
              title: "Offline Mode",
              description: "Using cached hymn data. Some features may be limited.",
            });
          }
        } else {
          if (!background) {
            toast({
              title: "Offline Mode",
              description: "No cached data available. Connect to the internet to load hymns.",
              variant: "destructive",
            });
          }
        }
        if (!background) setLoading(false);
        return;
      }
      
      // Attempt to fetch from API
      const response = await fetch("/api/hymns")

      if (!response.ok) {
        throw new Error(`Failed to fetch hymns: ${response.status}`)
      }

      const data: Hymn[] = await response.json()

      // Merge with user-edited hymns stored locally
      let merged = data
      if (typeof window !== "undefined") {
        try {
          const userHymns = await db.hymns.toArray()
          const map = new Map<string | number, Hymn>()
          data.forEach((h) => map.set(h.hymnNumber, h))
          userHymns.forEach((uh: Hymn) => map.set(uh.hymnNumber, { ...map.get(uh.hymnNumber), ...uh }))
          merged = Array.from(map.values())
        } catch (e) {
          console.error("Dexie load error", e)
        }
      }

      // Precompute lowercase fields for faster simple checks/render
      const augmented = merged.map((h) => ({
        ...h,
        lowercaseTitle: (h.title || "").toLowerCase(),
        lowercaseLyrics: (h.lyrics || "").toLowerCase(),
      }))
      setHymns(augmented)
      
      // Save to cache for offline use
      saveToCache(augmented);

      // Show directory info if we're using fallback data
      // This is a simple heuristic - if we have exactly the number of hymns in our fallback data
      if (!background) {
        if (data.length === 11) {
          // 10 hymns + your example hymn
          setShowDirectoryInfo(true)
        }
      }
    } catch (error) {
      console.error("Error fetching hymns:", error)
      
      // If API fetch fails, try to use cached data
      const cachedHymns = loadFromCache();
      if (cachedHymns) {
        setHymns(cachedHymns);
        if (!background) {
          toast({
            title: "Connection Error",
            description: "Using cached hymn data. Connect to the internet for the latest updates.",
          });
        }
      } else {
        if (!background) {
          toast({
            title: "Error",
            description: "Failed to load hymns and no cache available.",
            variant: "destructive",
          });
        }
      }
    } finally {
      if (!background) setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      // Clear cache keys, then refetch
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(HYMNS_CACHE_KEY)
          localStorage.removeItem(CACHE_TIMESTAMP_KEY)
        } catch {}
      }
      await fetchHymns()
      toast({ title: "Refreshed", description: "Fetched latest hymns from server." })
    } catch {}
  }

  useEffect(() => {
    fetchHymns()
    if (navigator.onLine) {
      syncLocalEdits()
    }
  }, [toast])

  // Check admin status once on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/admin/status")
        if (res.ok) {
          const j = await res.json()
          setIsAdmin(Boolean(j?.admin))
        }
      } catch {}
    }
    check()
  }, [])

  // Measure header height to offset sticky list headers so search bar stays visible
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => {
      try { setHeaderHeight(Math.ceil(el.getBoundingClientRect().height)) } catch {}
    }
    update()
    let ro: ResizeObserver | null = null
    try {
      ro = new ResizeObserver(update)
      ro.observe(el)
    } catch {}
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      try { ro && ro.disconnect() } catch {}
    }
  }, [])

  // Build Fuse index lazily when hymns change to reduce main-thread work on mount
  useEffect(() => {
    let cancelled = false
    const build = async () => {
      try {
        const { default: FuseLib } = await import("fuse.js")
        const instance = new FuseLib(hymns, {
          keys: [
            {
              name: "hymnNumber",
              getFn: (item: Hymn) => normalize(String(item.hymnNumber || "")),
              weight: 0.5,
            },
            {
              name: "title",
              getFn: (item: Hymn) => normalize(item.title || ""),
              weight: 0.4,
            },
            {
              name: "lyrics",
              getFn: (item: Hymn) => normalize(item.lyrics || ""),
              weight: 0.3,
            },
            {
              name: "firstLine",
              getFn: (item: Hymn) => normalize(item.firstLine || ""),
              weight: 0.15,
            },
            {
              name: "author.name",
              getFn: (item: Hymn) => normalize(item.author?.name || ""),
              weight: 0.1,
            },
            {
              name: "category",
              getFn: (item: Hymn) => normalize(item.category || ""),
              weight: 0.05,
            },
          ],
          threshold: 0.4,
          ignoreLocation: true,
          includeScore: false,
        })
        if (!cancelled) setFuse(instance)
      } catch {}
    }
    const schedule = () => {
      try {
        // @ts-ignore
        if (typeof requestIdleCallback !== 'undefined') {
          // @ts-ignore
          requestIdleCallback(() => build())
          return
        }
      } catch {}
      setTimeout(build, 0)
    }
    if (hymns && hymns.length > 0) schedule()
    return () => { cancelled = true }
  }, [hymns])

  const filteredHymns = useMemo(() => {
    if (!debouncedQuery) return hymns
    const q = normalize(debouncedQuery)
    try {
      if (fuse) {
        return fuse.search(q).map((res: any) => res.item as Hymn)
      }
    } catch {}
    // Fallback lightweight filter until Fuse is ready
    return hymns.filter((h) => {
      const n = String(h.hymnNumber || "").toLowerCase()
      const t = (h as any).lowercaseTitle || (h.title || "").toLowerCase()
      const lyr = (h as any).lowercaseLyrics || (h.lyrics || "").toLowerCase()
      return n.includes(q) || t.includes(q) || lyr.includes(q)
    })
  }, [debouncedQuery, hymns, fuse])

  // Filter for choruses (hymns with ID starting with 's')
  const chorusHymns = useMemo(() => hymns.filter((hymn: Hymn) => 
    typeof hymn.hymnNumber === 'string' && hymn.hymnNumber.toString().toLowerCase().startsWith('s')
  ), [hymns])

  // Filter for regular hymns (not starting with 's')
  const regularHymns = useMemo(() => hymns.filter((hymn: Hymn) => 
    !(typeof hymn.hymnNumber === 'string' && hymn.hymnNumber.toString().toLowerCase().startsWith('s'))
  ), [hymns])

  const favoriteHymns = useMemo(() => hymns.filter((hymn) => favorites.some(f => f === hymn.hymnNumber)), [hymns, favorites])
  const recentHymns = useMemo(() => hymns
    .filter((hymn) => recentlyViewed.some(r => r === hymn.hymnNumber))
    .sort((a, b) => {
      return recentlyViewed.indexOf(a.hymnNumber) - recentlyViewed.indexOf(b.hymnNumber)
    })
  , [hymns, recentlyViewed])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setSelectedHymn(null)
    try { listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const handleHymnSelect = (hymnNumber: number | string) => {
    setSelectedHymn(hymnNumber === selectedHymn ? null : hymnNumber)

    // Add to recently viewed
    if (hymnNumber !== selectedHymn) {
      const updatedRecent = [hymnNumber, ...recentlyViewed.filter((id) => id !== hymnNumber)].slice(0, 5)
      setRecentlyViewed(updatedRecent)
    }
  }

  const toggleFavorite = (hymnNumber: number | string) => {
    if (favorites.some(f => f === hymnNumber)) {
      setFavorites(favorites.filter((id) => id !== hymnNumber))
    } else {
      setFavorites([...favorites, hymnNumber])
    }
  }

  const handleAddNewHymn = () => {
    setNewHymnType('hymn');
    setShowNewHymnDialog(true);
  }

  const handleAddNewChorus = () => {
    setNewHymnType('chorus');
    setShowNewHymnDialog(true);
  }

  const handleHymnCreated = (newHymn: Hymn) => {
    setHymns((prev) => {
      const next = [...prev, newHymn]
      saveToCache(next)
      return next
    })
    setShowNewHymnDialog(false)
    toast({
      title: "Success",
      description: newHymnType === 'hymn' ? "New hymn created successfully" : "New chorus created successfully",
    })
  }

  const handleHymnUpdatedLocal = (updated?: Hymn) => {
    if (updated) {
      setHymns((prev) => {
        const next = prev.map((h) => (h.hymnNumber === updated.hymnNumber ? updated : h))
        saveToCache(next)
        return next
      })
    } else {
      // deletion case: fetch from Dexie only
      setHymns((prev) => {
        const next = prev.filter((h) => h.hymnNumber !== selectedHymn)
        saveToCache(next)
        return next
      })
    }
  }

  const getDisplayHymns = () => {
    // Apply search filter if there's a search query
    const searchFiltered = searchQuery ? filteredHymns : hymns;
    
    switch (activeTab) {
      case "favorites":
        return favoriteHymns;
      case "recent":
        return recentHymns;
      case "choruses":
        return searchQuery ? searchFiltered.filter((hymn: Hymn) => 
          typeof hymn.hymnNumber === 'string' && hymn.hymnNumber.toString().toLowerCase().startsWith('s')
        ) : chorusHymns;
      case "all":
        return searchQuery ? searchFiltered : regularHymns;
      default:
        return searchFiltered;
    }
  }

  const getCurrentTabLabel = () => {
    switch (activeTab) {
      case "all": return "Hymn";
      case "choruses": return "Chorus";
      case "favorites": return "Favorite";
      case "recent": return "Recent";
      default: return "Item";
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen max-w-full overflow-hidden">
      <header ref={headerRef as any} className="sticky top-0 z-20 bg-background border-b p-2 sm:p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 sm:mb-4">Spiritual Baptist Hymnal</h1>

          <PWAInstallPrompt />

          {isOffline && (
            <Alert className="mb-2 sm:mb-4">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Offline Mode</AlertTitle>
              <AlertDescription>
                You are currently offline. Some features may be limited.
              </AlertDescription>
            </Alert>
          )}

          {showDirectoryInfo && (
            <Alert className="mb-2 sm:mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Using sample hymn data</AlertTitle>
              <AlertDescription>
                To use your own hymns, create a <code className="bg-muted px-1 py-0.5 rounded">hymns</code> folder in
                the project root and add your JSON files there. When you edit hymns, they will be saved to this folder.
              </AlertDescription>
            </Alert>
          )}

          <div className="relative mb-2 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Search by title, number, lyrics, author..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-20"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                className="absolute right-12 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedHymn(null)
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              aria-label="Toggle theme"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
              onClick={() => setTheme((resolvedTheme === 'dark') ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full min-h-[40px] overflow-x-auto">
              <TabsTrigger value="all" className="flex-1 flex items-center justify-center gap-1">
                <Music className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Hymns</span>
              </TabsTrigger>
              <TabsTrigger value="choruses" className="flex-1 flex items-center justify-center gap-1">
                <Mic className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Choruses</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex-1 flex items-center justify-center gap-1">
                <Heart className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Favorites</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Recent</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Centered action bar under tabs */}
          <div className="mt-2 sm:mt-3 flex w-full justify-center gap-2">
            <Button size="sm" onClick={handleRefresh} className="flex items-center gap-1" variant="outline">
              <RefreshCcw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            {!readOnly && (
              <>
                <Button size="sm" onClick={() => setAdminOpen(true)} className="flex items-center gap-1" variant="outline">
                  <span>{isAdmin ? "Admin" : "Admin Login"}</span>
                </Button>
                {activeTab === "all" ? (
                  <Button size="sm" onClick={handleAddNewHymn} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span>Add Hymn</span>
                  </Button>
                ) : activeTab === "choruses" ? (
                  <Button size="sm" onClick={handleAddNewChorus} className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span>Add Chorus</span>
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading hymns...</p>
            </div>
          </div>
        ) : (
          <>
            <HymnList
              hymns={getDisplayHymns()}
              selectedHymn={selectedHymn}
              onHymnSelect={handleHymnSelect}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              isAdmin={!readOnly && isAdmin}
              onEdit={(hn) => setEditHymn(hn)}
              listRef={listRef}
              stickyOffset={headerHeight}
            />
          </>
        )}
      </main>

      {/* Admin edit sheet when selected and admin */}
      {editHymn && !loading && !readOnly && isAdmin && (
        <HymnDetail
          hymn={hymns.find((h) => h.hymnNumber === editHymn)!}
          onClose={() => setEditHymn(null)}
          isFavorite={favorites.some(f => f === editHymn)}
          onToggleFavorite={() => editHymn && toggleFavorite(editHymn)}
          isOffline={isOffline}
          onHymnUpdated={handleHymnUpdatedLocal}
        />
      )}

      <NewHymnDialog 
        open={showNewHymnDialog} 
        type={newHymnType}
        onOpenChange={setShowNewHymnDialog}
        onHymnCreated={handleHymnCreated}
        existingHymns={hymns}
      />

      {/* Admin Login Dialog */}
      <AlertDialog open={adminOpen} onOpenChange={setAdminOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAdmin ? "Admin" : "Admin Login"}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter admin secret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: adminSecret.trim() })
                  })
                  if (res.ok) {
                    setIsAdmin(true)
                    setAdminOpen(false)
                    setAdminSecret("")
                    toast({ title: 'Admin enabled', description: 'You can now save edits to the server.' })
                  } else {
                    toast({ title: 'Invalid secret', description: 'Please try again.', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'Error', description: 'Network error.', variant: 'destructive' })
                }
              }}
            >
              {isAdmin ? 'Refresh Session' : 'Login'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
