import { Board } from './Board'
import { PieceType } from './types'

export class Player {
  name: string
  board: Board
  pool: PieceType[]
  tier: number
  maxGold: number
  socket: SocketIO.Socket
  health: number
  ready: boolean

  constructor (name: string, socket: SocketIO.Socket) {
    this.name = name
    this.socket = socket
    this.board = new Board()
    this.pool = []
    this.tier = 1
    this.maxGold = 3
    this.health = 30
    this.ready = false
  }
}
