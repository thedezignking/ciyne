import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, PDFName, PDFRawStream, PDFRef, PDFArray } from 'pdf-lib'
import { inflateSync, deflateSync } from 'zlib'
import { MAX_PDF_BYTES } from '@/types'

export const runtime = 'nodejs'

function strToHex(s: string): string {
  return Buffer.from(s, 'binary').toString('hex').toUpperCase()
}

function spacesHex(len: number): string {
  return '20'.repeat(len)
}

function findTJArrays(content: string): { start: number; end: number; raw: string }[] {
  const results: { start: number; end: number; raw: string }[] = []
  let i = 0
  while (i < content.length) {
    if (content[i] === '[') {
      const start = i
      i++
      let depth = 1
      let inParen = false
      let escaped = false
      while (i < content.length && depth > 0) {
        if (escaped) { escaped = false; i++; continue }
        if (inParen) {
          if (content[i] === '\\') escaped = true
          else if (content[i] === ')') inParen = false
        } else {
          if (content[i] === '(') inParen = true
          else if (content[i] === ']') depth--
        }
        if (depth > 0) i++
      }
      i++
      const after = content.substring(i, i + 10).match(/^\s*TJ/i)
      if (after) {
        const arrayContent = content.substring(start + 1, i - 1)
        const opEnd = i + after[0].length
        results.push({ start, end: opEnd, raw: arrayContent })
        i = opEnd
        continue
      }
    }
    i++
  }
  return results
}

function extractTJText(arrayContent: string): string {
  const parts: string[] = []
  const re = /\(([^)]*(?:\\.[^)]*)*)\)|<([0-9A-Fa-f]+)>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(arrayContent)) !== null) {
    if (m[1] !== undefined) {
      parts.push(m[1].replace(/\\(.)/g, '$1'))
    } else if (m[2]) {
      parts.push(Buffer.from(m[2], 'hex').toString('binary'))
    }
  }
  return parts.join('')
}

function blankInTJArray(arrayContent: string, placeholder: string): { result: string; found: boolean } {
  const fullText = extractTJText(arrayContent)
  if (!fullText.includes(placeholder)) return { result: arrayContent, found: false }

  let result = arrayContent

  result = result.replace(/\(([^)]*(?:\\.[^)]*)*)\)/g, (match, inner: string) => {
    const decoded = inner.replace(/\\(.)/g, '$1')
    if (decoded.includes(placeholder) || placeholder.includes(decoded)) {
      return `(${' '.repeat(inner.length)})`
    }
    return match
  })

  result = result.replace(/<([0-9A-Fa-f]+)>/g, (match, hex: string) => {
    const decoded = Buffer.from(hex, 'hex').toString('binary')
    if (decoded.includes(placeholder) || placeholder.includes(decoded)) {
      return `<${spacesHex(decoded.length)}>`
    }
    return match
  })

  return { result, found: true }
}

/**
 * Receives a PDF + placeholder strings. Blanks each placeholder from the
 * content streams (replaces with spaces) and returns the cleaned PDF.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf')
    const placeholdersRaw = formData.get('placeholders')

    if (!(pdfFile instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 })
    }
    if (pdfFile.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF must be 20MB or smaller' }, { status: 400 })
    }
    if (typeof placeholdersRaw !== 'string') {
      return NextResponse.json({ error: 'Placeholders are required' }, { status: 400 })
    }

    let placeholders: { pageIndex: number; placeholder: string }[]
    try {
      placeholders = JSON.parse(placeholdersRaw)
    } catch {
      return NextResponse.json({ error: 'Invalid placeholders' }, { status: 400 })
    }

    const pdfBytes = await pdfFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const context = pdfDoc.context

    const byPage = new Map<number, string[]>()
    for (const p of placeholders) {
      if (p.pageIndex < 0 || p.pageIndex >= pages.length) continue
      const arr = byPage.get(p.pageIndex) ?? []
      arr.push(p.placeholder)
      byPage.set(p.pageIndex, arr)
    }

    const blanked: string[] = []

    for (const pageIndex of Array.from(byPage.keys())) {
      const pagePlaceholders = byPage.get(pageIndex)!
      const page = pages[pageIndex]
      const contentsEntry = page.node.get(PDFName.of('Contents'))
      if (!contentsEntry) continue

      const streamRefs: PDFRef[] = []
      if (contentsEntry instanceof PDFRef) {
        streamRefs.push(contentsEntry)
      } else if (contentsEntry instanceof PDFArray) {
        for (let i = 0; i < contentsEntry.size(); i++) {
          const el = contentsEntry.get(i)
          if (el instanceof PDFRef) streamRefs.push(el)
        }
      }

      for (const ref of streamRefs) {
        const stream = context.lookup(ref)
        if (!(stream instanceof PDFRawStream)) continue

        const filter = stream.dict.get(PDFName.of('Filter'))
        const isFlate = filter?.toString() === '/FlateDecode'

        let raw: Buffer
        try {
          raw = isFlate
            ? inflateSync(Buffer.from(stream.contents))
            : Buffer.from(stream.contents)
        } catch {
          continue
        }

        let text = raw.toString('binary')
        let modified = false

        for (const placeholder of pagePlaceholders) {
          // TJ arrays
          const tjOps = findTJArrays(text)
          for (let oi = tjOps.length - 1; oi >= 0; oi--) {
            const op = tjOps[oi]
            const { result: newArray, found } = blankInTJArray(op.raw, placeholder)
            if (found) {
              text = text.substring(0, op.start + 1) + newArray + text.substring(op.end - 2)
              modified = true
              blanked.push(placeholder)
            }
          }

          // Hex strings
          const hexSearch = strToHex(placeholder)
          const hexRegex = new RegExp(hexSearch, 'gi')
          if (hexRegex.test(text)) {
            text = text.replace(hexRegex, spacesHex(placeholder.length))
            modified = true
            if (!blanked.includes(placeholder)) blanked.push(placeholder)
          }

          // Literal strings
          const escaped = placeholder.replace(/([()\\])/g, '\\$1')
          if (text.includes(escaped)) {
            text = text.split(escaped).join(' '.repeat(placeholder.length))
            modified = true
            if (!blanked.includes(placeholder)) blanked.push(placeholder)
          }
        }

        if (modified) {
          const newRaw = Buffer.from(text, 'binary')
          const newContents = isFlate ? deflateSync(newRaw) : newRaw
          const newDict = stream.dict.clone(context)
          newDict.set(PDFName.of('Length'), context.obj(newContents.length))
          const newStream = PDFRawStream.of(newDict, newContents)
          context.assign(ref, newStream)
        }
      }
    }

    const cleanedPdf = await pdfDoc.save()
    return new NextResponse(Buffer.from(cleanedPdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Blanked': JSON.stringify(blanked),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Blank fields error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process PDF' },
      { status: 500 }
    )
  }
}
