'use client'

import { useCallback } from 'react'
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
  const handleCanvasReady = useCallback(() => {}, [])

  const handlePlacementChange = useCallback(
    (p: Omit<SignaturePlacement, 'pageIndex'>) => {
      onPlacement({ ...p, pageIndex: 0 })
    },
    [onPlacement]
  )

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-page/60 px-3 py-1.5 text-xs font-medium text-secondary">
        <Move className="h-3.5 w-3.5 text-accent-600" aria-hidden />
        Drag to move · pull the corner to resize
      </p>
      <DocumentPreview
        pdfFile={pdfFile}
        onReady={handleCanvasReady}
        overlay={(width, height) => (
          <div
            className="pointer-events-none absolute left-0 top-0"
            style={{ width, height }}
          >
            <div className="pointer-events-auto absolute left-0 top-0" style={{ width, height }}>
              <SignaturePlacer
                signatureDataUrl={signatureDataUrl}
                canvasWidth={width}
                canvasHeight={height}
                onPlacementChange={handlePlacementChange}
              />
            </div>
          </div>
        )}
      />
    </div>
  )
}
