#!/usr/bin/env python3
"""Draws an avatar's four moods to a PNG so the art can be checked before saving."""
import json
import struct
import sys
import zlib

WIDTH = 24
SCALE = 8
GAP = 16
BACKGROUND = bytes.fromhex('252525')  # the strip the pet sits on


def frames(avatar):
    yield avatar['body']
    for mood in ('working', 'happy', 'oops'):
        swaps = avatar['faces'][mood]
        yield [swaps.get(str(y), row) for y, row in enumerate(avatar['body'])]


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


def main(source, target):
    with open(source) as file:
        avatar = json.load(file)

    palette = {letter: bytes.fromhex(colour[1:]) for letter, colour in avatar['palette'].items()}
    palette['.'] = BACKGROUND
    moods = list(frames(avatar))

    for mood in moods:
        for y, row in enumerate(mood):
            if len(row) != WIDTH:
                sys.exit(f'Row {y} is {len(row)} wide, not {WIDTH}: {row}')

    gap = BACKGROUND * GAP
    lines = []

    for y in range(len(moods[0])):
        cells = [b''.join(palette[pixel] * SCALE for pixel in mood[y]) for mood in moods]
        lines += [b'\0' + gap + gap.join(cells) + gap] * SCALE

    header = struct.pack('>IIBBBBB', (len(lines[0]) - 1) // 3, len(lines), 8, 2, 0, 0, 0)

    with open(target, 'wb') as file:
        file.write(
            b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', header)
            + chunk(b'IDAT', zlib.compress(b''.join(lines)))
            + chunk(b'IEND', b'')
        )


if __name__ == '__main__':
    main(*sys.argv[1:3])
