import { inflateRawSync } from 'node:zlib'
import { AppError, validationError } from './errors'

const MAX_ENTRIES = 128
const MAX_EXPANDED_BYTES = 8 * 1024 * 1024

// Batas file terkompresi saja tidak membatasi alokasi memori parser XLSX.
export function validateXlsxArchive(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const invalid = () => validationError('Arsip XLSX rusak atau formatnya tidak didukung')
  if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50) throw invalid()
  let end = bytes.length - 22
  const minimum = Math.max(0, end - 65535)
  while (end >= minimum && view.getUint32(end, true) !== 0x06054b50) end -= 1
  if (end < minimum || end + 22 + view.getUint16(end + 20, true) !== bytes.length) throw invalid()
  const entries = view.getUint16(end + 10, true)
  const directorySize = view.getUint32(end + 12, true)
  const directoryOffset = view.getUint32(end + 16, true)
  if (
    view.getUint32(end + 4, true) !== 0 ||
    view.getUint16(end + 8, true) !== entries ||
    !entries ||
    entries > MAX_ENTRIES ||
    directoryOffset + directorySize !== end
  )
    throw invalid()

  let offset = directoryOffset
  let expanded = 0
  const names = new Set<string>()
  const ranges: Array<{ start: number; end: number }> = []
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw invalid()
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const expandedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (
      next > end ||
      flags & 1 ||
      (method !== 0 && method !== 8) ||
      view.getUint16(offset + 34, true) !== 0 ||
      localOffset + 30 > directoryOffset
    )
      throw invalid()
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength)
    const name = new TextDecoder().decode(nameBytes)
    if (
      !name ||
      names.has(name) ||
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/')
    )
      throw invalid()
    names.add(name)
    expanded += expandedSize
    if (expanded > MAX_EXPANDED_BYTES) {
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Isi XLSX setelah dekompresi maksimal 8 MB')
    }
    if (
      view.getUint32(localOffset, true) !== 0x04034b50 ||
      view.getUint16(localOffset + 6, true) !== flags ||
      view.getUint16(localOffset + 8, true) !== method ||
      view.getUint16(localOffset + 26, true) !== nameLength
    )
      throw invalid()
    const dataOffset = localOffset + 30 + nameLength + view.getUint16(localOffset + 28, true)
    if (
      dataOffset + compressedSize > directoryOffset ||
      !nameBytes.every((byte, i) => bytes[localOffset + 30 + i] === byte)
    )
      throw invalid()
    if (
      !(flags & 8) &&
      (view.getUint32(localOffset + 18, true) !== compressedSize ||
        view.getUint32(localOffset + 22, true) !== expandedSize)
    )
      throw invalid()
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize)
    try {
      const actual =
        method === 0
          ? compressed
          : inflateRawSync(compressed, { maxOutputLength: Math.max(1, expandedSize) })
      if (actual.length !== expandedSize) throw invalid()
    } catch {
      throw invalid()
    }
    ranges.push({ start: localOffset, end: dataOffset + compressedSize })
    offset = next
  }
  if (offset !== end || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml'))
    throw invalid()
  ranges.sort((a, b) => a.start - b.start)
  let previousEnd = 0
  for (const range of ranges) {
    if (range.start < previousEnd || range.start - previousEnd > 16) throw invalid()
    previousEnd = range.end
  }
  if (directoryOffset - previousEnd > 16) throw invalid()
}
