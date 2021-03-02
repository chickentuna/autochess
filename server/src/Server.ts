import { Phase } from './Phase'
import { Player } from './Player'
import { Piece, PieceType, PIECE_NAME } from './types'
import { coordToBoardIndex, randint, shuffle } from './utils'
import log from './webapp/log'
import * as chess from 'js-chess-engine'
import { BOARD_COLUMNS, BOARD_ROWS } from './Board'

export const TIERS = 3
export const POOL_COUNT = 3

interface ChessMove {
  from: string
  to:string
}

interface ChessGame {
  constructor(boardConfiguration?: ChessBoard)

  move(from: string, to: string)

  moves(from?:string): string[]

  aiMove(level?:number)

  getHistory(reversed?: boolean)

  printToConsole():void

  exportJson(): string

  exportFEN():string

  board: {configuration: ChessBoard}
}

interface ChessBoard {
  turn: 'black' | 'white',
  pieces: {
    [key:string]: string
  },
  moves: {
    [key:string]: string[]
  },
  isFinished: boolean,
  check: boolean,
  checkMate: boolean,
  castling: {
      whiteLong: boolean,
      whiteShort: boolean,
      blackLong: boolean,
      blackShort: boolean
  },
  enPassant?: string,
  halfMove?: number,
  fullMove?: number
}

// interface ChessPiece {
// }

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
      const black = playerPool[idx + 1]
      this.performBattle(white, black)
    }
  }

  initChessEngine (white:Player, black:Player): ChessGame {
    const board:ChessBoard = {
      turn: 'white',
      pieces: {
      },
      moves: {
      },
      isFinished: false,
      check: false,
      checkMate: false,
      castling: {
        whiteLong: true,
        whiteShort: true,
        blackLong: true,
        blackShort: true
      }
    }

    for (const player of [white, black]) {
      player.pieces.forEach((piece, idx) => {
        if (piece == null) {
          return
        }

        const coordCol = 'ABCDEFGH'[idx % BOARD_COLUMNS]
        const coordRow = player === white
          ? (idx < BOARD_COLUMNS ? 2 : 1)
          : (idx < BOARD_COLUMNS ? 7 : 8)

        const coordKey = coordCol + coordRow
        if (player === white) {
          board.pieces[coordKey] = PIECE_NAME[piece.type].toUpperCase()
        } else {
          board.pieces[coordKey] = PIECE_NAME[piece.type].toLowerCase()
        }
      })
    }

    return new chess.Game(board)
  }

  isPiece (x:number | false): x is number {
    return x !== false
  }

  convertPieces (game:ChessGame, col:'white'|'black') :Piece[] {
    const res:Piece[] = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
    Object.entries(game.board.configuration.pieces).forEach(([pos, piece]) => {
      const bIdx = coordToBoardIndex(pos)
      const type = {
        p: PieceType.PAWN,
        b: PieceType.BISHOP,
        n: PieceType.KNIGHT,
        r: PieceType.CASTLE,
        q: PieceType.QUEEN,
        k: PieceType.KING
      }[piece.toLowerCase()]

      const pieceColor = this.isColor(piece, 'white') ? 'white' : 'black'

      if (pieceColor === col) {
        res[bIdx] = {
          type
        }
      }
    })
    return res
  }

  isColor (piece:string, col:'white'|'black') {
    if (col === 'white') {
      return 'PBNKRQ'.includes(piece)
    }
    return 'pbnkrq'.includes(piece)
  }

  performBattle (white:Player, black:Player) {
    const game = this.initChessEngine(white, black);

    [white, black].forEach(player => {
      player.socket && player.socket.emit('battle_phase', {
        white: { name: white.name, health: white.health, pieces: this.convertPieces(game, 'white') },
        black: { name: black.name, health: black.health, pieces: this.convertPieces(game, 'black') }
      })
    })

    let turn = 0
    let stopCounter = 2

    while (stopCounter > 0) {
      const board = game.board.configuration.pieces
      const col = turn % 2 === 0 ? 'white' : 'black'
      const pieces = Object.entries(board).filter(([pos, piece]) => this.isColor(piece, col))
      const moveMoves: ChessMove[] = []
      const attackMoves: ChessMove[] = []

      pieces.forEach(([pos, piece]) => {
        game.moves(pos).forEach(target => {
          const move = { from: pos, to: target }
          const takesPiece = board[move.to]
          if (takesPiece && this.isAllowedMove(move.from, move.to, col)) {
            attackMoves.push(move)
          } else if (this.isAllowedMove(move.from, move.to, col)) {
            moveMoves.push(move)
          }
        })
      })
      const movePool = attackMoves.length > 0 ? attackMoves : moveMoves
      if (movePool.length > 0) {
        const move = movePool[randint(0, movePool.length)]
        this.doMove(game, move, white, black)
        stopCounter = 2
      } else {
        stopCounter--
        log.debug('no moves')
      }
      turn++
    }
    [white, black].forEach(player => player.socket && player.socket.emit('game_end'))

    const board = game.board.configuration.pieces
    // const whitePiecesLeft = Object.entries(board).filter(([pos, piece]) => piece === 'white').length
    // const blackPiecesLeft = Object.entries(board).filter(([pos, piece]) => piece === 'black').length
    // white.health -= blackPiecesLeft
    // black.health -= whitePiecesLeft
    // TODO: this sucks because of check mate
    // TODO:
    // If checkmate, inflict damage equal to all your pieces, do not take damage, else inflict damage equal to all pieces that made it across
  }

  malhaDistance (a:string, b:string) {
    const xd = Math.abs('ABCDEFGH'.indexOf(a[0]) - 'ABCDEFGH'.indexOf(b[0]))
    const yd = Math.abs(parseInt(a[1]) - parseInt(b[1]))
    return Math.max(xd, yd)
  }

  isAllowedMove (pos:string, target:string, col:string) {
    return this.goingForwards(pos, target, col) && this.malhaDistance(pos, target) <= 2
  }
  // isAllowedA (pos:string, target:string, col:string) {
  //   return this.goingForwards(pos, target, col) && this.malhaDistance(pos, target) <= 2
  // }

  startsAtEnd (from:string, color:string) {
    if (color === 'white') {
      return from[1] === '8'
    } else {
      return from[1] === '1'
    }
  }

  goingForwards (from, to, color) {
    if (color === 'white') {
      return to[1] > from[1]
    } else {
      return from[1] > to[1]
    }
  }

  doMove (game:ChessGame, move:ChessMove, white, black) {
    game.move(move.from, move.to);
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
      for (let pidx = 1; pidx <= player.tier; ++pidx) {
        player.pool = [...player.pool, ...this.pool[pidx].slice(idx, idx + POOL_COUNT + pidx)]
      }

      idx++
    }
  }
}
