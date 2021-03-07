import { Piece, PieceType } from './types'

export const BOARD_ROWS = 2
export const BOARD_COLUMNS = 8

export function newBoard (): Piece[] {
  const pieces = []

  for (let i = 0; i < BOARD_ROWS * BOARD_COLUMNS; ++i) {
    pieces.push(null)
  }
  pieces[0] = { type: PieceType.PAWN }
  pieces[2] = { type: PieceType.PAWN }
  return pieces
}
