import { Piece, PieceType } from "./types"

export const BOARD_ROWS = 2
export const BOARD_COLUMNS = 8

export class Board {
  pieces: Piece[]
  constructor () {
    this.pieces = []
    for (let i = 0; i < BOARD_ROWS * BOARD_COLUMNS; ++i) {
      this.pieces.push(null)
    }
    this.pieces[0] = new Piece(PieceType.KING)
  }
}
