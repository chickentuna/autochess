import { Phase } from './Phase'
import { PieceType } from './PieceType'
import * as io from './io'
import { randint, shuffle } from './utils'
import palettes from 'nice-color-palettes'

function hexToRGB (col) {
  return parseInt(col.slice(1), 16)
}

const palette = palettes[randint(0, 100)].map(hexToRGB)
shuffle(palette)

const BOARD_ROWS = 2
const BOARD_COLUMNS = 8
const POOL_COUNT = 3

export class Piece {
  type: PieceType
  constructor (type: PieceType) {
    this.type = type
  }
}

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

export class Player {
  name: string
  board: Board
  pool: PieceType[]
  tier: number
  gold: number
  health: number

  constructor (name: string) {
    this.name = name
    this.board = new Board()
    this.pool = []
    this.tier = 1
    this.gold = 3
    this.health = 30
  }
}

export class Server {
  players: Player[]
  pool: PieceType[]
  phase: Phase

  constructor () {
    this.players = []
    this.phase = Phase.SHOP
    this.pool = []

    const debugPlayer = new Player('player')
    this.players.push(debugPlayer)

    for (let i = 0; i < 16; ++i) {
      this.pool.push(randint(PieceType.PAWN, PieceType.KNIGHT))
    }

    this.refreshPools()
    io.on('ready', () => {
      this.phase = Phase.BATTLE
    })
  }

  start () {
    this.startShopPhase()
  }

  startShopPhase () {
    for (const player of this.players) {
      io.emit('shop_phase', {
        gold: player.gold,
        health: player.health,
        tier: player.tier,
        pool: player.pool,
        board: player.board
      })
    }
  }

  refreshPools () {
    shuffle(this.pool)
    let idx = 0
    for (const player of this.players) {
      player.pool = this.pool.slice(idx, idx + POOL_COUNT)
      idx++
    }
  }
}
