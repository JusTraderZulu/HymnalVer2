import Dexie, { Table } from "dexie"
import type { Hymn } from "@/types/hymn"

class HymnalDB extends Dexie {
  hymns!: Table<Hymn, string | number> // primary key is hymnNumber
  pendingDeletes!: Table<{ hymnNumber: string | number }, string | number>

  constructor() {
    super("hymnal")
    this.version(1).stores({
      hymns: "&hymnNumber, lowercaseTitle, lowercaseLyrics, category",
    })
    this.version(2).stores({
      hymns: "&hymnNumber, lowercaseTitle, lowercaseLyrics, category",
      pendingDeletes: "&hymnNumber",
    })
  }
}

export const db = new HymnalDB() 