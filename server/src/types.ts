export interface Piece {
  type: PieceType
}

export enum PieceType {
  PAWN = 0,
  BISHOP = 1,
  KNIGHT = 2,
  CASTLE = 3,
  QUEEN = 4,
  KING = 5
}

export const PIECE_NAME = {
  [PieceType.PAWN]: 'pawn',
  [PieceType.BISHOP]: 'bishop',
  [PieceType.KNIGHT]: 'knight',
  [PieceType.CASTLE]: 'rook',
  [PieceType.QUEEN]: 'queen',
  [PieceType.KING]: 'king'
}
