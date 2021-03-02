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
  [PieceType.PAWN]: 'p',
  [PieceType.BISHOP]: 'b',
  [PieceType.KNIGHT]: 'n',
  [PieceType.CASTLE]: 'r',
  [PieceType.QUEEN]: 'q',
  [PieceType.KING]: 'k'
}
