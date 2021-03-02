import * as PIXI from 'pixi.js'

export interface Point {
  x:number,
  y:number
}

export function randint (a:number, b:number):number {
  return Math.floor(a + Math.random() * (b - a))
}

export function choice <T> (arr:T[]):T {
  if (arr.length === 1) {
    return arr[0]
  }
  return arr[randint(0, arr.length)]
}

/**
 * Returns the scale needed to fit (srcWidth, srcHeight) inside (maxWidth, maxHeight)
 */
export function fitAspectRatio (srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number): number {
  return Math.min(maxWidth / srcWidth, maxHeight / srcHeight)
}

export function shuffle (array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

export function toLocal (object: PIXI.DisplayObject, point: PIXI.IPoint): PIXI.IPoint {
  const pos = { x: -point.x, y: -point.y } as any
  const localPos = object.toGlobal(pos)
  return new PIXI.Point(-localPos.x, -localPos.y)
}

interface IPoint {
  x: number,
  y: number
}

export function inBounds (point:IPoint, x1:number, y1:number, x2?:number, y2?:number): boolean {
  if (x2 == null || y2 == null) {
    return point.x >= 0 && point.y >= 0 && point.x < x1 && point.y < y1
  }
  return point.x >= x1 && point.y >= y1 && point.x < x2 && point.y < y2
}

export const ALPHA = 'ABCDEFGH'

export function coordToPosition (coord:string, cellSize: number) {
  const letter = coord[0]
  return new PIXI.Point(ALPHA.indexOf(letter) * cellSize, (parseInt(coord[1]) - 1) * cellSize)
}

export function unlerp (a, b, v) {
  return Math.min(1, Math.max(0, (v - a) / (b - a)))
}

export function lerp (a, b, u) {
  return a + (b - a) * u
}
