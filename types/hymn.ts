export interface Author {
  name: string
  birthYear?: number | string
  deathYear?: number | string
  bio?: string
}

export interface Hymn {
  hymnNumber: number | string
  title: string
  author?: Author
  category?: string
  lyrics: string
  fileName?: string
  firstLine?: string
  lowercaseTitle?: string
  lowercaseLyrics?: string
}
