import { newBoard } from './Board'
import { Piece, PieceType } from './types'

export class Player {
  name: string
  pieces: Piece[]
  pool: PieceType[]
  tier: number
  maxGold: number
  socket: SocketIO.Socket
  health: number
  ready: boolean

  constructor (name: string, socket: SocketIO.Socket) {
    this.name = name
    this.socket = socket
    this.pieces = newBoard()
    this.pool = []
    this.tier = 2
    this.maxGold = 300
    this.health = 30
    this.ready = false
  }
}
