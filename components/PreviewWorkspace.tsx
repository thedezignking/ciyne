'use client'

import { useCallback, useState } from 'react'
import { Move } from 'lucide-react'
import DocumentPreview from '@/components/DocumentPreview'
import SignaturePlacer from '@/components/SignaturePlacer'
import type { SignaturePlacement } from '@/types'

type PreviewWorkspaceProps = {
  pdfFile: File
  signatureDataUrl: string
  onPlacement: (placement: SignaturePlacement) => void
}

export default function PreviewWorkspace({
  pdfFile,
  signatureDataUrl,
  onPlacement,
}: PreviewWorkspaceProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState<number | null>(null)

  const handleCanvasReady = useCallback(() => {}, [])

  const handlePageCountKnown = useCallback((count: number) => {
    setPageCount(count)
  }, [])

  const handlePlacementChange = useCallback(
    (p: Omit<SignaturePlacement, 'pageIndex'>) => {
      onPlacement({ ...p, pageIndex })
    },
    [onPlacement, pageIndex]
  )

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-page/60 px-3 py-1.5 text-xs font-medium text-secondary">
        <Move className="h-3.5 w-3.5 text-accent-600" aria-hidden />
        Drag to move · pull the corner to resize
        {pageCount !== null && pageCount > 1 && (
          <span className="text-muted">· navigate pages in the toolbar</span>
        )}
      </p>
      <DocumentPreview
        pdfFile={pdfFile}
        pageIndex={pageIndex}
        pageCount={pageCount}
        onPageCountKnown={handlePageCountKnown}
        onReady={handleCanvasReady}
        onPageChange={setPageIndex}
        overlay={(width, height) => (
          <SignaturePlacer
            signatureDataUrl={signatureDataUrl}
            canvasWidth={width}
            canvasHeight={height}
            onPlacementChange={handlePlacementChange}
          />
        )}
      />
    </div>
  )
}
