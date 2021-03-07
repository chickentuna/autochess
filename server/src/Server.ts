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
        for (const player of this.players) {
          player.socket.emit('reload')
        }
        this.players = []
        this.playerMap = {}
        log.debug('user disconnected', socket.handshake.address)
      })
      socket.on('ready', (pieces:Piece[]) => {
        const player = this.playerMap[socket.id]
        if (player == null) {
          socket.emit('reload')
          return
        }
        if (player.ready) {
          console.log('ignoring a READY')
          return
        }
        player.pieces = pieces
        player.ready = true
        if (this.players.length && this.players.every(p => p.ready)) {
          console.log('start battle phase')
          this.startBattlePhase()
        }
      })

      socket.on('go', () => {
        if (this.players.length >= 1) {
          this.start()
        }
      })

      socket.on('join', (name: string) => {
        if (this.phase === Phase.LOBBY) {
          const player = new Player(name, socket)
          this.players.push(player)
          this.playerMap[socket.id] = player
          for (const p of this.players) {
            p.socket.emit('lobby', this.players.map(v => v.name))
          }
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

    this.computeRanking(this.players)

    for (const loser of this.players.filter(p => p.health <= 0)) {
      loser.socket.emit('lose', {
        rank: loser.rank
      })
    }

    this.players = this.players.filter(p => p.health > 0)
    if (this.players.length === 1) {
      const winner = this.players[0]
      winner.socket.emit('win', {
        rank: winner.rank
      })
    } else {
      this.startShopPhase()
    }
  }

  computeRanking (players) {
    players.sort((a, b) => b.health - a.health)
    let rank = 1
    let localRank = 1
    for (var i = 0; i < players.length; i++) {
      if (i > 0 && players[i].health < players[i - 1].health) {
        localRank = rank
      }
      rank++
      players[i].rank = localRank
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

    let turn: 'black'|'white' = 'white'
    let stopCounter = 2

    while (stopCounter > 0) {
      const board = game.board.configuration.pieces
      const pieces = Object.entries(board).filter(([pos, piece]) => this.isColor(piece, turn))
      const moveMoves: ChessMove[] = []
      const attackMoves: ChessMove[] = []

      pieces.forEach(([pos, piece]) => {
        game.moves(pos).forEach(target => {
          const move = { from: pos, to: target }
          const takesPiece = board[move.to]
          if (takesPiece && this.isAllowedMove(move.from, move.to, turn)) {
            attackMoves.push(move)
          } else if (this.isAllowedMove(move.from, move.to, turn)) {
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
        log.debug('no moves')
        stopCounter--
        game.board.configuration.turn = turn === 'white' ? 'black' : 'white'
      }
      turn = turn === 'white' ? 'black' : 'white'
    }
    [white, black].forEach(player => player.socket && player.socket.emit('game_end'))

    const whitePoints = this.countPiecesOnRow(game, 8, 'white')
    const blackPoints = this.countPiecesOnRow(game, 1, 'black')

    // const diff = whitePoints - blackPoints
    // if (diff > 0) {
    //   black.health -= diff
    // } if (diff < 0) {
    //   white.health += diff
    // }
    white.health -= blackPoints
    black.health -= whitePoints
  }

  countPiecesOnRow (game:ChessGame, row:number, col:'white'|'black'):number {
    return Object.entries(game.board.configuration.pieces)
      .filter(([pos, piece]) => this.isColor(piece, col))
      .filter(([pos, piece]) => parseInt(pos[1]) === row)
      .length
  }

  malhaDistance (a:string, b:string) {
    const xd = Math.abs('ABCDEFGH'.indexOf(a[0]) - 'ABCDEFGH'.indexOf(b[0]))
    const yd = Math.abs(parseInt(a[1]) - parseInt(b[1]))
    return Math.max(xd, yd)
  }

  isAllowedMove (pos:string, target:string, col:string) {
    return this.goingForwards(pos, target, col) && this.malhaDistance(pos, target) <= 2
  }

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
    log.debug('shop_phase')
    for (const player of this.players) {
      player.ready = false
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
      player.pool = []
      for (let pidx = 1; pidx <= player.tier; ++pidx) {
        player.pool = [...player.pool, ...this.pool[pidx].slice(idx, idx + POOL_COUNT + pidx)]
      }

      idx++
    }
  }
}
