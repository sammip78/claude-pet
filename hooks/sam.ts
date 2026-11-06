import type { Avatar } from '../types'

// The pet everyone starts with, and the worked example /pet copies from.
export const SAM: Avatar = {
  name: 'Sam',
  outfit: 'a red number 7 shirt',
  palette: {
    H: '#17151C', // hair
    h: '#34323F', // hair highlight
    S: '#D29C74', // skin
    s: '#B8835C', // skin shadow on ears, nose and jaw
    u: '#C48E66', // soft shadow around the mouth
    B: '#1C1618', // eyebrows
    E: '#1E1613', // eyes
    w: '#F4EFE7', // eye whites
    M: '#7A3A2C', // lips
    T: '#F6F1E8', // teeth
    D: '#4A1F1A', // open mouth
    R: '#D7281C', // shirt
    r: '#A81C13', // shirt shadow
    W: '#FAFAF8', // collar, cuffs and shirt number
    e: '#D3D5D8', // collar and shorts trim
    P: '#FAFAF8', // shorts
    O: '#C9CDD3', // socks
    Y: '#D9342C', // shoes
    Q: '#D9342C', // wristband
    A: '#121214', // watch
    L: '#C9CDD3', // laptop
    m: '#A7ACB4', // laptop edge
    F: '#282E9A', // laptop logo
    b: '#6FB7E8', // sweat drop
  },
  body: [
    '.........HHHHHHHH.......',
    '.......HHHHHHHHHHHH.....',
    '......HHHHHhhHHHHHHH....',
    '.....HHHHhhHHHHHHHHH....',
    '.....HHHHHHHHHHHHHHH....',
    '.....HHHHHHHHHHHHHHH....',
    '.....HHHHHSSSHHSSSHH....',
    '.....HHSSSSSSSSSSSHH....',
    '.....HSSSSSSSSSSSSSH....',
    '.....HSBBBBSSSBBBBSH....',
    '....sSSSSSSSSSSSSSSSs...',
    '....sSSSEwSSSSSEwSSSs...',
    '....sSSSEESSSSSEESSSs...',
    '.....SSSSSSSsSSSSSSS....',
    '.....SSSSSSSsSSSSSSS....',
    '.....SSSSSSsssSSSSSS....',
    '......SSSuuuuuuuSSS.....',
    '......SSSMTTTTTMSSS.....',
    '.......SSuusssuuSS......',
    '........uSSSSSSSu.......',
    '.........sSSSSSs........',
    '.......eeesSSSseee......',
    '.....RRRRWWSSSWWRRRR....',
    '....RRRRRRRWWWRRRRRRR...',
    '...RRRRRRRRRRRRRRRRRRR..',
    '...RRrRRRRWWWWWRRRRrRR..',
    '...RRrRRRRRRRRWRRRRrRR..',
    '...WWrRRRRRRRWRRRRRrWW..',
    '...SSrRRRRRRWRRRRRRrSS..',
    '...SSrRRRRRRWRRRRRRrSS..',
    '...QQrRRRRRRRRRRRRRrAA..',
    '...SSrrrrrrrrrrrrrrrSS..',
    '...SSePPPPPPePPPPPPeSS..',
    '.....ePPPPPPePPPPPPe....',
    '.....ePPPPPe.ePPPPPe....',
    '......SSSSS...SSSSS.....',
    '......OOOOO...OOOOO.....',
    '.....YYYYYY...YYYYYY....',
  ],
  faces: {
    working: {
      11: '....sSSSSSSSSSSSSSSSs...',
      12: '....sSSSEESSSSSEESSSs...',
      17: '......SSSSSMMMSSSSS.....',
      18: '.......SSuuuuuuuSS......',
      25: '...RRrLLLLLLLLLLLLLrRR..',
      26: '...RRrLLLLLLLLLLLLLrRR..',
      27: '...WWrLLLLLFFFLLLLLrWW..',
      28: '...SSrLLLLLFFFLLLLLrSS..',
      29: '...SSrLLLLLLLLLLLLLrSS..',
      30: '...QQrmmmmmmmmmmmmmrAA..',
    },
    happy: {
      8: '.....HSBBBBSSSBBBBSH....',
      9: '.....HSSSSSSSSSSSSSH....',
      11: '....sSSSEESSSSSEESSSs...',
      12: '....sSSESSESSSESSESSs...',
      17: '......SSMTTTTTTTMSS.....',
      18: '.......SSMDDDDDMSS......',
    },
    oops: {
      5: '.....HHHHHHHHHHHHHHH.b..',
      6: '.....HHHHHSSSHHSSSHH.b..',
      7: '.....HHSSSSSSSSSSSHHbbb.',
      8: '.....HSBBBBSSSBBBBSHbbb.',
      9: '.....HSSSSSSSSSSSSSH.b..',
      11: '....sSSwEEwSSSwEEwSSs...',
      12: '....sSSwEEwSSSwEEwSSs...',
      17: '......SSSSSDDDSSSSS.....',
      18: '.......SSuuDDDuuSS......',
    },
  },
}
