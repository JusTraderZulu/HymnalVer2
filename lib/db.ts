import Dexie, { Table } from "dexie"
import type { Hymn } from "@/types/hymn"

class HymnalDB extends Dexie {
  hymns!: Table<Hymn, string | number> // primary key is hymnNumber

  constructor() {
    super("hymnal")
    this.version(1).stores({
      hymns: "&hymnNumber, lowercaseTitle, lowercaseLyrics, category",
    })
  }
}

export const db = new HymnalDB() 