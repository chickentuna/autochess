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

export function shuffle<T> (array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function coordToBoardIndex (coord:string) {
  const x = 'ABCDEFGH'.indexOf(coord[0])
  const y = {
    8: 1,
    7: 0,
    1: 1,
    2: 0
  }[coord[1]]
  return y * 8 + x
}
