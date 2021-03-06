var PALETTES = [
  [0xBAAB88, 0x237272, 0x518985, 0x4f5453, 0x43304F],
  [0x6E6159, 0x66782C, 0x7F963B, 0xADBF45, 0xAFC57A],
  [0x0B415B, 0x17E0F5, 0xE7FFFF, 0x070322, 0x0AF7F1],
  [0x8EA1A5, 0x721A33, 0x90012F, 0xC9012F, 0xDD0D2F],
  [0xD4E2A6, 0xF3B993, 0xE27667, 0x99C4CC, 0x4F3E3B],
  [0x0F5FAA, 0x25CCF8, 0xF5FDFD, 0x72B900, 0xF2D62F],
  [0xC2BAB8, 0xA29696, 0x9D9648, 0xB6BE97, 0x343138],
  [0x4F93A6, 0xF2BB9D, 0xD69382, 0xA47273, 0x0]
]

export const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
