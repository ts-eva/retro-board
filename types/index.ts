export type ColumnType = 'WENT_WELL' | 'WENT_POORLY' | 'IDEAS' | 'ACTION_ITEMS'

export interface Reaction {
  id: string
  cardId: string
  emoji: string
  author: string
}

export interface CardLink {
  id: string
  fromId: string
  toId: string
}

export interface Card {
  id: string
  boardId: string
  column: ColumnType
  content: string
  author: string
  resolved: boolean
  createdAt: string
  reactions: Reaction[]
  linksFrom: CardLink[]
  linksTo: CardLink[]
}

export interface Board {
  id: string
  title: string
  createdAt: string
  previousBoard: string | null
  cards: Card[]
}

export interface BoardPageData {
  board: Board
  previousCards: Card[]
}
