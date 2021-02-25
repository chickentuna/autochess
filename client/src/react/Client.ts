import { Phase } from './Phase'
import { PieceType } from './PieceType'
import * as PIXI from 'pixi.js'
import { Drawer, WHITE } from './xchess/Drawer'
import { fitAspectRatio, inBounds, randint, shuffle, toLocal } from './utils'
import palettes from 'nice-color-palettes'
import io from '../socket'
import { GlowFilter } from 'pixi-filters'

function hexToRGB (col) {
  return parseInt(col.slice(1), 16)
}

let palette = palettes[randint(0, 100)].map(hexToRGB)
shuffle(palette)
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
  place?: 'board' | 'shop'
}

type Pieces = Piece[]

type BoardCoord = {
  boardCoord?: PIXI.IPoint,
  boardIdx?: number
}

export class Client {
  pool: PieceType[]
  phase: Phase
  gold: number
  baseGold: number
  health: number
  tier: number
  pieces: Pieces

  stage: PIXI.Container
  shopRoom: PIXI.Container
  battleRoom: PIXI.Container
  shopContainer: PIXI.Container
  boardContainer: PIXI.Container
  boardGraphics: PIXI.Sprite
  goldLabel: PIXI.Text
  tierLabel: PIXI.Text
  healthLabel: PIXI.Text
  piecesInShop: Piece[]
  glowFilter: GlowFilter
  selectedPiece: Piece
  hoveringOver: BoardCoord

  width: number
  height: number

  drawer: Drawer

  constructor ({ stage, renderer, view }: PIXI.Application) {
    this.stage = stage
    this.width = view.width
    this.height = view.height
    this.phase = Phase.LOBBY
    this.pool = []
    this.hoveringOver = {}

    this.drawer = new Drawer(renderer)

    this.glowFilter = new GlowFilter({
      distance: 10,
      outerStrength: 4,
      innerStrength: 0,
      color: 0xFF00000,
      quality: 0.1,
      knockout: false
    })

    this.initShopRoom()

    io.on('reload', window.location.reload)

    io.on('shop_phase', (data) => {
      this.phase = Phase.SHOP
      this.gold = data.gold
      this.baseGold = data.gold
      this.health = data.health
      this.tier = data.tier
      this.pool = data.pool
      this.pieces = data.pieces

      this.shopRoom.visible = true

      this.redrawPool()
      this.updateHUD()
      this.redrawPieces()
    })

    this.gold = 0
    this.baseGold = 0
    this.health = 0
    this.tier = 0
    this.pool = []
    this.pieces = []
    io.emit('join', 'player')
  }

  // TODO: rename to initPieces
  redrawPieces () {
    // this.boardContainer.removeChildren()
    for (let y = 0; y < BOARD_ROWS; ++y) {
      for (let x = 0; x < BOARD_COLUMNS; ++x) {
        const idx = y * BOARD_COLUMNS + x
        const piece = this.pieces[idx]
        if (piece != null) {
          const sprite = this.drawer.drawPiece(piece.type)
          this.boardContainer.addChild(sprite)
          sprite.position.set(this.drawer.cellSize * x, this.drawer.cellSize * y)
          const newPiece = this.initBoardPiece(piece, sprite)
          this.pieces[idx] = newPiece
        }
      }
    }
  }

  updateHUD () {
    this.goldLabel.text = `Gold: ${this.gold.toString()}/${this.baseGold.toString()}`
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

  isBuyable (piece: Piece) {
    if (this.gold < 3) {
      return false
    }
    if (this.pieces.every(v => v != null)) {
      return false
    }
    return true
  }

  initShopPiece (pieceType: PieceType, sprite: PIXI.Sprite):Piece {
    const piece:Piece = { type: pieceType, sprite, place: 'shop' }

    piece.sprite.interactive = true
    piece.sprite.on('mouseover', () => {
      if (this.isBuyable(piece)) {
        piece.hover = true
        this.refreshPiece(piece)
      }
    })
    piece.sprite.on('mouseout', () => {
      piece.hover = false
      this.refreshPiece(piece)
    })
    piece.sprite.on('mousedown', (ev) => {
      if (this.isBuyable(piece)) {
        if (this.selectedPiece == null) {
          this.selectedPiece = piece
        } else if (this.selectedPiece === piece) {
          this.selectedPiece = null
        }
        this.refreshPiece(piece)
        ev.stopPropagation()
      }
    })
    return piece
  }

  // TODO: factorize
  initBoardPiece (serverPiece: Piece, sprite: PIXI.Sprite):Piece {
    const piece:Piece = { ...serverPiece, sprite, place: 'board' }
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
    for (const piece of [...this.pieces, ...this.piecesInShop]) {
      if (piece != null) {
        this.refreshPiece(piece)
      }
    }
  }

  refreshPiece (piece) {
    const selected = this.selectedPiece === piece
    const selectable = piece.place === 'shop'
      ? this.selectedPiece == null && this.isBuyable(piece)
      : this.selectedPiece == null
    piece.sprite.filters = piece.hover && selectable ? [this.glowFilter] : []
    piece.sprite.alpha = selected ? 0.5 : 1
    piece.sprite.cursor = (selectable || selected) ? 'pointer' : 'default'
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
    this.boardGraphics = board

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

    const ghost = this.drawer.drawPiece(PieceType.PAWN)
    ghost.alpha = 0.5
    ghost.visible = false
    this.boardContainer.addChild(ghost)

    const readyButton = new PIXI.Graphics()
    readyButton.beginFill(palette[3], 1)
    readyButton.lineStyle(frameWidth / 2, palette[0], 1)
    readyButton.drawRoundedRect(0, 0, this.width / 8 - frameWidth, this.height / 16, frameWidth / 2)
    readyButton.position.set(7 * this.width / 8, this.height / 2)
    readyButton.endFill()

    const readyLabel = new PIXI.Text('Ready', {
      fill: palette[0],
      fontSize: 14,
      fontWeight: 'bold'
    })
    readyLabel.anchor.set(0.5)
    readyLabel.position.set(
      readyButton.x + readyButton.width / 2 - frameWidth / 4,
      readyButton.y + readyButton.height / 2 - frameWidth / 4
    )

    readyButton.interactive = true
    readyButton.cursor = 'pointer'
    readyButton.on('mousedown', ev => {
      io.emit('ready', this.pieces.map(piece => piece == null ? null : { type: piece.type }))
    })

    shopRoom.on('mousedown', ev => {
      const { boardCoord, boardIdx } = this.hoveringOver
      if (boardCoord != null && this.selectedPiece != null && (this.selectedPiece.place === 'board' || this.isBuyable(this.selectedPiece))) {
        let pieceSprite
        if (this.selectedPiece.place === 'shop') {
          pieceSprite = this.drawer.drawPiece(this.selectedPiece.type)
          this.boardContainer.addChild(pieceSprite)
          this.pieces[boardIdx] = this.initBoardPiece({ type: this.selectedPiece.type }, pieceSprite)
          this.gold -= 3
          const shopIdx = this.piecesInShop.findIndex(v => v === this.selectedPiece)
          this.selectedPiece.sprite.parent.removeChild(this.selectedPiece.sprite)
          this.piecesInShop.splice(shopIdx, 1)
        } else {
          const oldBoardIdx = this.pieces.findIndex(v => v === this.selectedPiece)
          this.pieces[oldBoardIdx] = null
          this.pieces[boardIdx] = this.selectedPiece
          pieceSprite = this.selectedPiece.sprite
        }
        pieceSprite.position.set(boardCoord.x * this.drawer.cellSize, boardCoord.y * this.drawer.cellSize)

        this.selectedPiece = null
        this.hoveringOver = {}
        this.refreshPieces()
        this.updateHUD()
      } else {
        this.selectedPiece = null
        this.refreshPieces()
      }
    })
    shopRoom.on('mousemove', ({ data }) => {
      const { boardIdx, boardCoord } = this.getFreeCellBelowGlobal(data.global)
      this.hoveringOver = {}
      ghost.visible = false
      shopRoom.cursor = 'default'
      if (boardIdx != null) {
        this.hoveringOver = { boardCoord, boardIdx }
        ghost.texture = this.drawer.textures.PIECES[WHITE][this.selectedPiece.type]
        ghost.visible = true
        ghost.position.set(boardCoord.x * this.drawer.cellSize, boardCoord.y * this.drawer.cellSize)
        shopRoom.cursor = 'pointer'
      }
    })
    shopRoom.interactive = true

    shopRoom.addChild(background)
    shopRoom.addChild(boardFrame)
    shopRoom.addChild(board)
    shopRoom.addChild(pool)
    shopRoom.addChild(this.shopContainer)
    shopRoom.addChild(this.boardContainer)
    shopRoom.addChild(goldLabel)
    shopRoom.addChild(healthLabel)
    shopRoom.addChild(tierLabel)
    shopRoom.addChild(readyButton)
    shopRoom.addChild(readyLabel)

    this.stage.addChild(shopRoom)
    this.shopRoom = shopRoom
  }

  getFreeCellBelowGlobal (point: PIXI.IPoint): BoardCoord {
    const boardPos = toLocal(this.boardGraphics, point)
    const boardCoord = this.toBoardCoord(boardPos)
    const boardIdx = this.toBoardIdx(boardCoord)
    if (inBounds(boardCoord, BOARD_COLUMNS, BOARD_ROWS) && this.selectedPiece != null && this.pieces[boardIdx] == null) {
      return {
        boardIdx,
        boardCoord
      }
    }
    return {}
  }

  toBoardCoord (point: PIXI.IPoint): PIXI.IPoint {
    return new PIXI.Point(
      Math.floor(point.x / this.drawer.cellSize),
      Math.floor(point.y / this.drawer.cellSize)
    )
  }

  toBoardIdx (boardCoord: PIXI.IPoint) {
    return boardCoord.y * BOARD_COLUMNS + boardCoord.x
  }
}
