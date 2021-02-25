import { Phase } from './Phase'
import { Player } from './Player'
import { Piece, PieceType, PIECE_NAME } from './types'
import { randint, shuffle } from './utils'
import log from './webapp/log'
import ChessEngine from 'simple-chess-engine'
import { BOARD_COLUMNS, BOARD_ROWS } from './Board'

export const TIERS = 3
export const POOL_COUNT = 3

type ChessEngineBoard = Record<string, {
  piece: string,
  color: 'black' | 'white' | 'none'
}>

export class Server {
  players: Player[]
  pool: Record<number, PieceType[]>
  phase: Phase
  playerMap: Record<string, Player>
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
      socket.on('ready', (pieces:Piece[]) => {
        const player = this.playerMap[socket.id]
        if (player == null) {
          socket.emit('reload')
          return
        }
        player.pieces = pieces
        player.ready = true
        if (this.players.every(p => p.ready)) {
          this.startBattlePhase()
        }
      })
      socket.on('join', (name: string) => {
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

  startBattlePhase () {
    this.phase = Phase.BATTLE
    // Matchmake
    const playerPool:Player[] = shuffle([...this.players])
    if (playerPool.length % 2 === 1) {
      const aPlayer = playerPool[0]
      playerPool.push({ ...aPlayer, name: 'bot', socket: null })
    }

    for (let idx = 0; idx < playerPool.length; idx += 2) {
      const white = playerPool[idx]
      const black = playerPool[idx + 1];

      [white, black].forEach(player => {
        player.socket && player.socket.emit('battle_phase', {
          white: { name: white.name, health: white.health, pieces: white.pieces },
          black: { name: white.name, health: white.health, pieces: white.pieces }
        })
      })
      this.performBattle(white, black)
    }
  }

  initChessEngine (white, black) {
    const game = new ChessEngine()
    const content = {}
    for (let y = 0; y < 8; ++y) {
      for (let x = 0; x < 8; ++x) {
        const coord = 'ABCDEFGH'[x] + (y + 1)
        // content[coord] = { piece: 'none', color: 'none' }
      }
    }

    white.pieces.forEach((piece, idx) => {
      if (piece == null) {
        return
      }
      const coordCol = 'ABCDEFGH'[idx % BOARD_COLUMNS]
      const coordRow = idx < BOARD_COLUMNS ? 2 : 1
      const coord = coordCol + coordRow
      content[coord] = {
        color: 'white', piece: PIECE_NAME[piece.type]
      }
    })
    black.pieces.forEach((piece, idx) => {
      if (piece == null) {
        return
      }
      const coordCol = 'ABCDEFGH'[idx % BOARD_COLUMNS]
      const coordRow = idx < BOARD_COLUMNS ? 7 : 8
      const coord = coordCol + coordRow
      content[coord] = {
        color: 'black', piece: PIECE_NAME[piece.type]
      }
    })

    const opts = { firstPlayer: 'white' }
    game.loadBoard(JSON.stringify(content), opts)
    return game
  }

  performBattle (white:Player, black:Player) {
    const game = this.initChessEngine(white, black)
    let turn = 0
    let stop = false

    while (!stop) {
      const status = game.getStatus()
      if (status.isCheckmate || status.isStalemate) {
        log.debug(JSON.stringify(status))
        stop = true
        break
      }

      const board:ChessEngineBoard = game.getBoard()
      const col = turn % 2 === 0 ? 'white' : 'black'
      const pieces = Object.entries(board).filter(([pos, piece]) => piece.color === col)
      const moveMoves = []
      const attackMoves = []

      pieces.forEach(([pos, piece]) => {
        game.getPossibleMoves(pos).forEach(target => {
          const takesPiece = board[target] && board[target].color !== 'none'
          if (takesPiece) {
            attackMoves.push({ from: pos, to: target })
          } else if (!this.goingBackwards(pos, target, piece, col)) {
            moveMoves.push({ from: pos, to: target })
          } else {
          }
        })
      })
      const movePool = attackMoves.length > 0 ? attackMoves : moveMoves
      if (movePool.length > 0) {
        const move = movePool[randint(0, movePool.length)]
        this.doMove(game, move, white, black)
      } else {
        stop = true
        log.debug('no moves')
      }
      turn++
    }
    [white, black].forEach(player => player.socket && player.socket.emit('game_end'))
    const board:ChessEngineBoard = game.getBoard()
    const whitePiecesLeft = Object.entries(board).filter(([pos, piece]) => piece.color === 'white').length
    const blackPiecesLeft = Object.entries(board).filter(([pos, piece]) => piece.color === 'black').length
    white.health -= blackPiecesLeft
    black.health -= whitePiecesLeft
  }

  goingBackwards (from, to, piece, color) {
    if (color === 'white') {
      return to[1] < from[1]
    } else {
      return from[1] > to[1]
    }
  }

  doMove (game, move, white, black) {
    game.makeMove(move.from, move.to);
    [white, black].forEach(player => player.socket && player.socket.emit('move', move))
  }

  startShopPhase () {
    this.phase = Phase.SHOP
    this.refreshPools()
    for (const player of this.players) {
      log.debug('shop_phase')
      player.socket.emit('shop_phase', {
        gold: player.maxGold,
        health: player.health,
        tier: player.tier,
        pool: player.pool,
        pieces: player.pieces
      })
    }
  }

  refreshPools () {
    for (let i = 0; i < TIERS; ++i) {
      shuffle(this.pool[i + 1])
    }
    let idx = 0
    for (const player of this.players) {
      player.pool = this.pool[player.tier].slice(idx, idx + POOL_COUNT)
      idx++
    }
  }
}
