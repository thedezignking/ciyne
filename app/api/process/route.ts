import { NextRequest, NextResponse } from 'next/server'
import { embedSignature, dataUrlToUint8Array } from '@/lib/embedSignature'
import { MAX_PDF_BYTES } from '@/types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const originalPDF = formData.get('originalPDF')
    const signatureImage = formData.get('signatureImage')
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

    const numbers = [x, y, width, height, canvasWidth, canvasHeight]
    if (numbers.some((n) => !Number.isFinite(n) || n <= 0)) {
      return NextResponse.json({ error: 'Invalid placement coordinates' }, { status: 400 })
    }

    const pdfBytes = await originalPDF.arrayBuffer()
    const signaturePngBytes = dataUrlToUint8Array(signatureImage)

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
