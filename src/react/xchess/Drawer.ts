import * as PIXI from 'pixi.js'
import { Piece } from '../Server'
import { PieceType } from '../PieceType'
import sheet from './sheet.png'

export const COLOUR_DARK = 0xb58863
export const COLOUR_LIGHT = 0xf0d9b5

const TEXTURE_POSITION = {
  [PieceType.PAWN]: 5,
  [PieceType.BISHOP]: 2,
  [PieceType.KNIGHT]: 3,
  [PieceType.CASTLE]: 4,
  [PieceType.QUEEN]: 1,
  [PieceType.KING]: 0
}

const WHITE = 0
const BLACK = 1

type Colour = typeof BLACK | typeof WHITE

export const ALPHA = 'abcdefgh'

const CELL_SIZE = 60

export interface Textures {
  PIECES: Record<Colour, Record<PieceType, PIXI.Texture>>
}

export class Drawer {
  textures: Textures
  renderer: PIXI.Renderer

  constructor (renderer: PIXI.Renderer) {
    this.renderer = renderer

    // const square = new PIXI.Graphics()
    // square.beginFill(0xFFFFFF, 1)
    // square.drawRect(0, 0, 1, 1)
    // square.endFill()

    // const PIXEL = PIXI.Texture.WHITE
    // renderer.generateTexture(square, PIXI.SCALE_MODES.LINEAR, 1)

    const sheetTexture = new PIXI.BaseTexture(sheet)
    const w = 640 / 6
    const h = 213 / 2
    const sprites: any = {
      [WHITE]: {},
      [BLACK]: {}
    }
    for (let p = PieceType.PAWN; p <= PieceType.KING; ++p) {
      for (let k = 0; k < 2; ++k) {
        sprites[k][p] = new PIXI.Texture(sheetTexture, new PIXI.Rectangle(w * TEXTURE_POSITION[p], h * k, w, h))
      }
    }
    const PIECES = sprites

    this.textures = { PIECES: PIECES as Record<Colour, Record<PieceType, PIXI.Texture>> }
  }

  coordToPosition (coord:string) {
    const letter = coord[0]
    return new PIXI.Point(ALPHA.indexOf(letter) * CELL_SIZE, (parseInt(coord[1]) - 1) * CELL_SIZE)
  }

  drawBoard (columns: number, rows: number) {
    const board = new PIXI.Container()
    for (let y = 0; y < rows; ++y) {
      for (let x = 0; x < columns; ++x) {
        const sprite = new PIXI.Sprite(PIXI.Texture.WHITE)
        sprite.position.set(x * CELL_SIZE, y * CELL_SIZE)
        sprite.tint = x % 2 === y % 2 ? COLOUR_DARK : COLOUR_LIGHT
        sprite.width = CELL_SIZE
        sprite.height = CELL_SIZE
        board.addChild(sprite)
      }
    }
    return new PIXI.Sprite(this.renderer.generateTexture(board, PIXI.SCALE_MODES.LINEAR, 1))
    // return board
  }

  get cellSize () {
    return CELL_SIZE
  }

  drawPiece (piece: PieceType, colour: Colour = WHITE) {
    const sprite = new PIXI.Sprite(this.textures.PIECES[colour][piece])
    sprite.width = CELL_SIZE
    sprite.height = CELL_SIZE
    return sprite
  }
}
