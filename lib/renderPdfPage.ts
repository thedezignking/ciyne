export type RenderedPdfPage = {
  canvas: HTMLCanvasElement
  width: number
  height: number
  pageCount: number
}

const PREVIEW_SCALE = 1.5

async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

export async function renderPdfPage(
  file: File,
  pageIndex = 0,
  scale = PREVIEW_SCALE
): Promise<RenderedPdfPage> {
  const pdfjs = await getPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    pageCount: pdf.numPages,
  }
}
