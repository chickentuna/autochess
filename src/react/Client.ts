import { Phase } from './Phase'
import { PieceType } from './PieceType'
import * as PIXI from 'pixi.js'
import { Drawer } from './xchess/Drawer'
import { fitAspectRatio, randint, shuffle } from './utils'
import palettes from 'nice-color-palettes'
import * as io from './io'
import { GlowFilter } from 'pixi-filters'

function hexToRGB (col) {
  return parseInt(col.slice(1), 16)
}

let palette = palettes[randint(0, 100)].map(hexToRGB)
shuffle(palette)
// console.log({ palette })
palette = [
  13413525,
  7637891,
  5993836,
  10321529,
  10130556
]

const BOARD_ROWS = 2
const BOARD_COLUMNS = 8

interface Piece {
  type: PieceType
  sprite?: PIXI.Sprite
  hover?: boolean
  selected?: boolean
}

export class Board {
  pieces: Piece[]
  constructor () {
    this.pieces = []
    for (let i = 0; i < BOARD_ROWS * BOARD_COLUMNS; ++i) {
      this.pieces.push(null)
    }
  }
}

export class Client {
  pool: PieceType[]
  phase: Phase
  gold: number
  health: number
  tier: number
  board: Board

  stage: PIXI.Container
  shopRoom: PIXI.Container
  battleRoom: PIXI.Container
  shopContainer: PIXI.Container
  boardContainer: PIXI.Container
  goldLabel: PIXI.Text
  tierLabel: PIXI.Text
  healthLabel: PIXI.Text
  piecesInShop: Piece[]
  piecesOnBoard: Piece[]
  glowFilter: GlowFilter
  selectedPiece: Piece

  width: number
  height: number

  drawer: Drawer

  constructor ({ stage, renderer, view }: PIXI.Application) {
    this.stage = stage
    this.width = view.width
    this.height = view.height
    this.phase = Phase.SHOP
    this.pool = []

    this.drawer = new Drawer(renderer)

    this.glowFilter = new GlowFilter({
      distance: 10,
      outerStrength: 4,
      innerStrength: 0,
      color: 0xFF00000,
      quality: 0.1,
      knockout: false
    })

    stage.interactive = true
    stage.on('mousedown', ev => {
      this.selectedPiece = null
      this.refreshPieces()
    })

    this.initShopRoom()

    io.on('shop_phase', (data) => {
      console.log({ data })
      this.phase = Phase.SHOP
      this.gold = data.gold
      this.health = data.health
      this.tier = data.tier
      this.pool = data.pool
      this.board = data.board

      this.redrawPool()
      this.updateHUD()
      this.redrawPieces()
    })
  }

  redrawPieces () {
    this.piecesOnBoard = []
    this.boardContainer.removeChildren()
    for (let y = 0; y < BOARD_ROWS; ++y) {
      for (let x = 0; x < BOARD_COLUMNS; ++x) {
        const idx = y * BOARD_ROWS + x
        const piece = this.board.pieces[idx]
        if (piece != null) {
          const sprite = this.drawer.drawPiece(piece.type)
          this.boardContainer.addChild(sprite)
          sprite.position.set(this.drawer.cellSize * x, this.drawer.cellSize * y)
          console.log(sprite)
          const debug = 'debug'
          window[debug] = sprite
          this.piecesOnBoard.push(this.initBoardPiece(piece, sprite))
        }
      }
    }
  }

  updateHUD () {
    this.goldLabel.text = `Gold: ${this.gold.toString()}/${this.gold.toString()}`
    this.tierLabel.text = `Tier: ${this.tier.toString()}`
    this.healthLabel.text = `Health: ${this.health.toString()}`
  }

  redrawPool () {
    this.shopContainer.removeChildren()
    const allPieces = new PIXI.Container()
    let i = 0

    this.piecesInShop = []
    for (const pieceType of this.pool) {
      const sprite = this.drawer.drawPiece(pieceType)
      allPieces.addChild(sprite)
      sprite.x = i * this.drawer.cellSize
      const piece = this.initShopPiece(pieceType, sprite)
      this.piecesInShop.push(piece)
      i++
    }
    allPieces.position.set(
      (3 * this.width / 4 - allPieces.width) / 2,
      (this.height / 4 - allPieces.height) / 2
    )

    this.shopContainer.addChild(allPieces)
  }

  initShopPiece (pieceType: PieceType, sprite: PIXI.Sprite):Piece {
    const piece:Piece = { type: pieceType, sprite }

    piece.sprite.interactive = true
    piece.sprite.cursor = 'pointer'
    piece.sprite.on('mouseover', () => {
      piece.hover = true
      this.refreshPiece(piece)
    })
    piece.sprite.on('mouseout', () => {
      piece.hover = false
      this.refreshPiece(piece)
    })
    piece.sprite.on('mousedown', (ev) => {
      if (this.selectedPiece == null) {
        this.selectedPiece = piece
      } else if (this.selectedPiece === piece) {
        this.selectedPiece = null
      }
      this.refreshPiece(piece)
      ev.stopPropagation()
    })
    return piece
  }

  // TODO: factorize
  initBoardPiece (serverPiece: Piece, sprite: PIXI.Sprite):Piece {
    const piece = { ...serverPiece, sprite }
    piece.sprite.interactive = true
    piece.sprite.cursor = 'pointer'
    piece.sprite.on('mouseover', () => {
      piece.hover = true
      this.refreshPiece(piece)
    })
    piece.sprite.on('mouseout', () => {
      piece.hover = false
      this.refreshPiece(piece)
    })
    piece.sprite.on('mousedown', (ev) => {
      if (this.selectedPiece == null) {
        this.selectedPiece = piece
      } else if (this.selectedPiece === piece) {
        this.selectedPiece = null
      }
      this.refreshPiece(piece)
      ev.stopPropagation()
    })
    return piece
  }

  refreshPieces () {
    for (const piece of [...this.piecesOnBoard, ...this.piecesInShop]) {
      this.refreshPiece(piece)
    }
  }

  refreshPiece (piece) {
    const selected = this.selectedPiece === piece
    const selectable = this.selectedPiece == null
    piece.sprite.filters = piece.hover && selectable ? [this.glowFilter] : []
    piece.sprite.alpha = selected ? 0.5 : 1
    piece.sprite.cursor = this.selectedPiece == null || this.selectedPiece === piece ? 'pointer' : 'default'
  }

  initBattleRoom () {
    this.battleRoom = new PIXI.Container()
    this.stage.addChild(this.battleRoom)
    this.battleRoom.visible = this.phase === Phase.BATTLE
  }

  initShopRoom () {
    const frameWidth = 8

    const shopRoom = new PIXI.Container()
    this.stage.addChild(shopRoom)
    shopRoom.visible = this.phase === Phase.SHOP

    const background = new PIXI.Sprite(PIXI.Texture.WHITE)
    background.tint = palette[2]
    background.width = this.width
    background.height = this.height

    const board = this.drawer.drawBoard(BOARD_COLUMNS, BOARD_ROWS)
    board.y = 3 * this.height / 4 - board.height / 2
    board.x = this.width / 2 - board.width / 2
    board.scale.set(fitAspectRatio(board.width, board.height, 3 * this.width / 4, this.height))

    this.boardContainer = new PIXI.Container()
    this.boardContainer.position.copyFrom(board.position)

    const boardFrame = new PIXI.Graphics()
    boardFrame.beginFill(palette[0], 1)
    boardFrame.drawRoundedRect(0, 0, board.width + frameWidth * 2, board.height + frameWidth * 2, frameWidth)
    boardFrame.endFill()
    boardFrame.position.copyFrom(board.position)
    boardFrame.x -= frameWidth
    boardFrame.y -= frameWidth

    const pool = new PIXI.Graphics()
    pool.beginFill(palette[1], 1)
    pool.lineStyle(frameWidth, palette[0], 1)
    pool.drawRoundedRect(0, 0, 3 * this.width / 4, this.height / 4, frameWidth)
    pool.endFill()
    pool.x = this.width / 2 - pool.width / 2
    pool.y = this.height / 8

    this.shopContainer = new PIXI.Container()
    this.shopContainer.position.copyFrom(pool.position)

    const goldLabel = new PIXI.Text('Gold: 0/0', {
      fill: palette[0],
      fontSize: 24,
      fontWeight: 'bold'
    })
    goldLabel.x = this.width / 8
    goldLabel.y = this.height - this.height / 16
    goldLabel.anchor.set(0, 0.5)
    this.goldLabel = goldLabel

    const healthLabel = new PIXI.Text('Health: 0', {
      fill: palette[0],
      fontSize: 24,
      fontWeight: 'bold'
    })
    healthLabel.x = this.width - this.width / 8
    healthLabel.y = this.height - this.height / 16
    healthLabel.anchor.set(1, 0.5)
    this.healthLabel = healthLabel

    const tierLabel = new PIXI.Text('Tier: 0', {
      fill: palette[0],
      fontSize: 24,
      fontWeight: 'bold'
    })
    tierLabel.x = this.width / 8
    tierLabel.y = this.height / 16
    tierLabel.anchor.set(0, 0.5)
    this.tierLabel = tierLabel

    shopRoom.addChild(background)
    shopRoom.addChild(boardFrame)
    shopRoom.addChild(board)
    shopRoom.addChild(pool)
    shopRoom.addChild(this.shopContainer)
    shopRoom.addChild(this.boardContainer)
    shopRoom.addChild(goldLabel)
    shopRoom.addChild(healthLabel)
    shopRoom.addChild(tierLabel)

    this.stage.addChild(shopRoom)
    this.shopRoom = shopRoom
  }
}
