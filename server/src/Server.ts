import { Phase } from './Phase'
import { Player } from './Player'
import { PieceType } from './types'
import { randint, shuffle } from './utils'
import log from './webapp/log'

export const TIERS = 3
export const POOL_COUNT = 3

export class Server {
  players: Player[]
  pool: Record<number, PieceType[]>
  phase: Phase
  playerMap: Record<number, Player>
  io: SocketIO.Server

  constructor (io: SocketIO.Server) {
    this.players = []
    this.phase = Phase.LOBBY
    this.pool = []
    this.io = io
    this.playerMap = {}

    this.pool[1] = []
    this.pool[2] = []
    this.pool[3] = []
    for (let i = 0; i < 16; ++i) {
      this.pool[1].push(randint(PieceType.PAWN, PieceType.KNIGHT))
      if (i < 10) { this.pool[2].push(randint(PieceType.KNIGHT, PieceType.QUEEN)) }
      if (i < 8) { this.pool[3].push(randint(PieceType.QUEEN, PieceType.KING)) }
    }
  }

  init () {
    this.configureSocketServer(this.io)
  }

  configureSocketServer (io: SocketIO.Server) {
    io.on('connection', (socket: SocketIO.Socket) => {
      log.debug('user connected', { ip: socket.handshake.address })

      socket.on('disconnect', () => {
        // this.players.splice(this.playerMap[socket])
        this.players = []
        log.debug('user disconnected', socket.handshake.address)
      })
      socket.on('ready', (pieces) => {
        const player = this.playerMap[socket.id]
        player.board.pieces = pieces
        player.ready = true
      })
      socket.on('join', (name: string) => {
        console.log(name)
        const player = new Player(name, socket)
        this.players.push(player)
        this.playerMap[socket.id] = player

        // TODO: a 'go' command, or use a countdown?
        if (this.players.length >= 1) {
          this.start()
        }
      })
    })
  }

  start () {
    this.startShopPhase()
  }

  startShopPhase () {
    this.phase = Phase.SHOP
    this.refreshPools()
    for (const player of this.players) {
      console.log('shop_phase')
      player.socket.emit('shop_phase', {
        gold: player.maxGold,
        health: player.health,
        tier: player.tier,
        pool: player.pool,
        board: player.board
      })
    }
  }

  refreshPools () {
    for (let i = 0; i < TIERS; ++i) {
      shuffle(this.pool[i + 1])
      let idx = 0
      for (const player of this.players) {
        // TODO: fix
        player.pool = this.pool[i + 1].slice(idx, idx + POOL_COUNT)
        idx++
      }
    }
  }
}
