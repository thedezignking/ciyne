import { NextRequest, NextResponse } from 'next/server'
import { embedSignature, embedSignatures, embedFilledTextFields, dataUrlToUint8Array } from '@/lib/embedSignature'
import type { Placement } from '@/lib/embedSignature'
import { MAX_PDF_BYTES } from '@/types'
import type { TextAnnotation, FilledTextField } from '@/types'

export const runtime = 'nodejs'

function validTextAnnotation(a: unknown): a is TextAnnotation {
  if (!a || typeof a !== 'object') return false
  const o = a as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (typeof o.text !== 'string') return false
  const nums = [o.pageIndex, o.x, o.y, o.width, o.fontSize, o.canvasWidth, o.canvasHeight]
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return false
  return (
    (o.canvasWidth as number) > 0 &&
    (o.canvasHeight as number) > 0 &&
    (o.pageIndex as number) >= 0 &&
    (o.fontSize as number) > 0
  )
}

function validPlacement(p: unknown): p is Placement {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  const nums = [o.pageIndex, o.x, o.y, o.width, o.height, o.canvasWidth, o.canvasHeight]
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return false
  return (
    (o.width as number) > 0 &&
    (o.height as number) > 0 &&
    (o.canvasWidth as number) > 0 &&
    (o.canvasHeight as number) > 0 &&
    (o.pageIndex as number) >= 0
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const originalPDF = formData.get('originalPDF')
    const signatureImage = formData.get('signatureImage')
    const placementsRaw = formData.get('placements')
    const textAnnotationsRaw = formData.get('textAnnotations')
    const pageIndex = Number(formData.get('pageIndex') ?? 0)
    const x = Number(formData.get('x'))
    const y = Number(formData.get('y'))
    const width = Number(formData.get('width'))
    const height = Number(formData.get('height'))
    const canvasWidth = Number(formData.get('canvasWidth'))
    const canvasHeight = Number(formData.get('canvasHeight'))

    if (!(originalPDF instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 })
    }

    if (typeof signatureImage !== 'string' || !signatureImage.startsWith('data:')) {
      return NextResponse.json({ error: 'Signature image is required' }, { status: 400 })
    }

    if (originalPDF.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF must be 20MB or smaller' }, { status: 400 })
    }

    const filledFieldsRaw = formData.get('filledTextFields')

    const pdfBytes = await originalPDF.arrayBuffer()
    const signaturePngBytes = dataUrlToUint8Array(signatureImage)

    // Parse optional text annotations
    let textAnnotations: TextAnnotation[] | undefined
    if (typeof textAnnotationsRaw === 'string' && textAnnotationsRaw.length > 0) {
      let parsed: unknown
      try {
        parsed = JSON.parse(textAnnotationsRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid text annotations' }, { status: 400 })
      }
      if (!Array.isArray(parsed) || !parsed.every(validTextAnnotation)) {
        return NextResponse.json({ error: 'Invalid text annotations' }, { status: 400 })
      }
      // Filter out empty text
      textAnnotations = (parsed as TextAnnotation[]).filter((a) => a.text.trim().length > 0)
    }

    // Parse optional filled text fields (AI form-fill)
    let filledFields: FilledTextField[] | undefined
    if (typeof filledFieldsRaw === 'string' && filledFieldsRaw.length > 0) {
      let parsed: unknown
      try {
        parsed = JSON.parse(filledFieldsRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid filled text fields' }, { status: 400 })
      }
      if (Array.isArray(parsed)) {
        filledFields = (parsed as FilledTextField[]).filter(
          (f) => f.value && f.value.trim().length > 0
        )
      }
    }

    // Batch path: embed the signature on multiple fields (sign-all).
    if (typeof placementsRaw === 'string' && placementsRaw.length > 0) {
      let parsed: unknown
      try {
        parsed = JSON.parse(placementsRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid placements' }, { status: 400 })
      }
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(validPlacement)) {
        return NextResponse.json({ error: 'Invalid placements' }, { status: 400 })
      }

      const signedPdf = await embedSignatures(pdfBytes, signaturePngBytes, parsed as Placement[], textAnnotations, filledFields)
      const filename = originalPDF.name.replace(/\.pdf$/i, '') + '-signed.pdf' || 'signed.pdf'
      return new NextResponse(Buffer.from(signedPdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const numbers = [x, y, width, height, canvasWidth, canvasHeight]
    if (numbers.some((n) => !Number.isFinite(n) || n <= 0)) {
      return NextResponse.json({ error: 'Invalid placement coordinates' }, { status: 400 })
    }

    const signedPdf = await embedSignature({
      pdfBytes,
      signaturePngBytes,
      pageIndex,
      x,
      y,
      width,
      height,
      canvasWidth,
      canvasHeight,
      textAnnotations,
      filledTextFields: filledFields,
    })

    const filename =
      originalPDF.name.replace(/\.pdf$/i, '') + '-signed.pdf' || 'signed.pdf'

    return new NextResponse(Buffer.from(signedPdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF processing error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process PDF' },
      { status: 500 }
    )
  }
}
