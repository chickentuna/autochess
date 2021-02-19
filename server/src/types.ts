export class Piece {
  type: PieceType
  constructor (type: PieceType) {
    this.type = type
  }
}

export enum PieceType {
  PAWN = 0,
  BISHOP = 1,
  KNIGHT = 2,
  CASTLE = 3,
  QUEEN = 4,
  KING = 5
}