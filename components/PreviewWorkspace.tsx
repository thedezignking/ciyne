'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Move, Sparkles, Loader2, ScanSearch, Check, PenLine, Type } from 'lucide-react'
import DocumentPreview from '@/components/DocumentPreview'
import SignaturePlacer from '@/components/SignaturePlacer'
import TextPlacer from '@/components/TextPlacer'
import { detectFields } from '@/lib/detectFields'
import type { DetectedField, SignaturePlacement, TextAnnotation } from '@/types'

type ActiveTool = 'signature' | 'text'

type PreviewWorkspaceProps = {
  pdfFile: File
  signatureDataUrl: string
  onPlacement: (placement: SignaturePlacement) => void
  /** Sign every detected field on the current page (null clears it). */
  onSignAll: (placements: SignaturePlacement[] | null) => void
  /** Called whenever text annotations change. */
  onTextAnnotations?: (annotations: TextAnnotation[]) => void
}

type DetectStatus = 'idle' | 'detecting' | 'done' | 'error' | 'unconfigured'

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v))

function fieldToRect(
  f: DetectedField,
  cw: number,
  ch: number,
  aspect: number
): { x: number; y: number; width: number; height: number } {
  const boxX = f.x * cw
  const boxY = f.y * ch
  const boxW = f.width * cw
  const boxH = f.height * ch
  let width = boxW * 0.96
  let height = width * aspect
  const maxH = boxH * 1.8
  if (height > maxH && maxH > 0) {
    height = maxH
    width = height / aspect
  }
  const x = clamp(0, Math.max(0, cw - width), boxX + (boxW - width) / 2)
  const y = clamp(0, Math.max(0, ch - height), boxY + boxH - height)
  return { x, y, width, height }
}

export default function PreviewWorkspace({
  pdfFile,
  signatureDataUrl,
  onPlacement,
  onSignAll,
  onTextAnnotations,
}: PreviewWorkspaceProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>('signature')
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])

  // AI detection state
  const [status, setStatus] = useState<DetectStatus>('idle')
  const [fields, setFields] = useState<DetectedField[]>([])
  const [detectError, setDetectError] = useState<string | null>(null)
  const [target, setTarget] = useState<DetectedField | null>(null)
  const [targetNonce, setTargetNonce] = useState(0)
  const [signAllActive, setSignAllActive] = useState(false)

  const dimsRef = useRef<{ w: number; h: number } | null>(null)
  const aspectRef = useRef(0.4)

  // Learn the signature aspect ratio for accurate auto-placement.
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 0) aspectRef.current = img.naturalHeight / img.naturalWidth
    }
    img.src = signatureDataUrl
  }, [signatureDataUrl])

  // Reset detection when the page changes — fields are page-specific.
  useEffect(() => {
    setFields([])
    setTarget(null)
    setStatus('idle')
    setDetectError(null)
    setSignAllActive(false)
    onSignAll(null)
  }, [pageIndex, onSignAll])

  const handlePageCountKnown = useCallback((count: number) => setPageCount(count), [])

  const handleDimensions = useCallback((w: number, h: number) => {
    dimsRef.current = { w, h }
  }, [])

  const handleTextAnnotationsChange = useCallback(
    (anns: TextAnnotation[]) => {
      // Stamp the current pageIndex + canvas dims onto each annotation
      const stamped = anns.map((a) => ({
        ...a,
        pageIndex,
        canvasWidth: dimsRef.current?.w ?? a.canvasWidth,
        canvasHeight: dimsRef.current?.h ?? a.canvasHeight,
      }))
      setTextAnnotations(stamped)
      onTextAnnotations?.(stamped)
    },
    [pageIndex, onTextAnnotations]
  )

  const handlePlacementChange = useCallback(
    (p: Omit<SignaturePlacement, 'pageIndex'>) => {
      // Manual drag takes over from a sign-all batch.
      if (signAllActive) {
        setSignAllActive(false)
        onSignAll(null)
      }
      onPlacement({ ...p, pageIndex })
    },
    [onPlacement, pageIndex, signAllActive, onSignAll]
  )

  const snapTo = useCallback((f: DetectedField) => {
    setTarget(f)
    setTargetNonce((n) => n + 1)
    setSignAllActive(false)
    onSignAll(null)
  }, [onSignAll])

  const runDetect = useCallback(async () => {
    setStatus('detecting')
    setDetectError(null)
    const result = await detectFields(pdfFile, pageIndex)
    if (!result.ok) {
      if (!result.configured) {
        setStatus('unconfigured')
      } else {
        setStatus('error')
        setDetectError(result.error)
      }
      return
    }
    // Signature fields first, then top-to-bottom.
    const sorted = [...result.fields].sort((a, b) => {
      const as = a.label === 'signature' ? 0 : 1
      const bs = b.label === 'signature' ? 0 : 1
      if (as !== bs) return as - bs
      return a.y - b.y
    })
    setFields(sorted)
    setStatus('done')
    if (sorted.length > 0) snapTo(sorted[0])
  }, [pdfFile, pageIndex, snapTo])

  const handleSignAll = useCallback(() => {
    const dims = dimsRef.current
    if (!dims || fields.length === 0) return
    const placements: SignaturePlacement[] = fields.map((f) => ({
      pageIndex,
      canvasWidth: dims.w,
      canvasHeight: dims.h,
      ...fieldToRect(f, dims.w, dims.h, aspectRef.current),
    }))
    onSignAll(placements)
    setSignAllActive(true)
  }, [fields, pageIndex, onSignAll])

  return (
    <div className="space-y-4">
      {/* AI assist panel */}
      <div className="rounded-2xl border border-border bg-page/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">Find signature fields automatically</p>
              <p className="text-xs text-secondary">
                Sends an image of this page to an AI service to locate where to sign.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runDetect()}
            disabled={status === 'detecting'}
            className="focus-accent inline-flex items-center gap-2 rounded-full border border-accent-600/40 bg-surface px-4 py-2 text-sm font-semibold text-accent-600 transition-colors hover:bg-accent-50 disabled:opacity-60"
          >
            {status === 'detecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="h-4 w-4" aria-hidden />
            )}
            {status === 'detecting' ? 'Scanning…' : 'Find fields with AI'}
          </button>
        </div>

        {/* Status line */}
        {status === 'done' && fields.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
            <span className="text-xs font-medium text-secondary">
              Found {fields.length} {fields.length === 1 ? 'field' : 'fields'} · placed on the first.
            </span>
            {fields.length > 1 && !signAllActive && (
              <button
                type="button"
                onClick={handleSignAll}
                className="focus-accent ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Sign all {fields.length} fields
              </button>
            )}
            {signAllActive && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-600">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Signing all {fields.length} fields
              </span>
            )}
          </div>
        )}
        {status === 'done' && fields.length === 0 && (
          <p className="mt-3 border-t border-border/70 pt-3 text-xs text-secondary">
            No signature fields detected on this page. Drag your signature into place manually.
          </p>
        )}
        {status === 'unconfigured' && (
          <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted">
            AI detection isn’t enabled on this deployment. You can still place your signature
            manually below.
          </p>
        )}
        {status === 'error' && (
          <p className="mt-3 border-t border-border/70 pt-3 text-xs text-red-600" role="alert">
            {detectError ?? 'Detection failed.'} You can place your signature manually below.
          </p>
        )}
      </div>

      {/* Tool toggle toolbar */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-page/60 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setActiveTool('signature')}
          className={`focus-accent inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'signature'
              ? 'bg-accent-600 text-white'
              : 'text-secondary hover:bg-black/5'
          }`}
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          Signature
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('text')}
          className={`focus-accent inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'text'
              ? 'bg-accent-600 text-white'
              : 'text-secondary hover:bg-black/5'
          }`}
        >
          <Type className="h-3.5 w-3.5" aria-hidden />
          Text
        </button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <p className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
          <Move className="h-3.5 w-3.5 text-accent-600" aria-hidden />
          {activeTool === 'signature'
            ? 'Drag to move · pull the corner to resize'
            : 'Click to place text · drag to move'}
          {pageCount !== null && pageCount > 1 && (
            <span className="text-muted">· navigate pages in the toolbar</span>
          )}
        </p>
      </div>

      <DocumentPreview
        pdfFile={pdfFile}
        pageIndex={pageIndex}
        pageCount={pageCount}
        onPageCountKnown={handlePageCountKnown}
        onPageChange={setPageIndex}
        onDimensions={handleDimensions}
        overlay={(width, height) => (
          <>
            {/* Detected field markers */}
            {fields.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => snapTo(f)}
                className="group absolute rounded-md border-2 border-dashed border-accent-600/60 bg-accent-500/5 transition-colors hover:bg-accent-500/15"
                style={{
                  left: f.x * width,
                  top: f.y * height,
                  width: f.width * width,
                  height: f.height * height,
                }}
                aria-label={`Place signature on ${f.label} field`}
              >
                <span className="absolute -top-5 left-0 rounded bg-accent-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {f.label}
                </span>
              </button>
            ))}

            {/* Hide the draggable signature while a sign-all batch is active */}
            {!signAllActive && activeTool === 'signature' && (
              <SignaturePlacer
                signatureDataUrl={signatureDataUrl}
                canvasWidth={width}
                canvasHeight={height}
                onPlacementChange={handlePlacementChange}
                target={target}
                targetNonce={targetNonce}
              />
            )}

            {/* Preview the signature on every field during sign-all */}
            {signAllActive &&
              fields.map((f, i) => {
                const r = fieldToRect(f, width, height, aspectRef.current)
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={signatureDataUrl}
                    alt=""
                    className="pointer-events-none absolute object-contain"
                    style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
                  />
                )
              })}

            {/* Text annotations layer */}
            <TextPlacer
              annotations={textAnnotations.filter((a) => a.pageIndex === pageIndex)}
              canvasWidth={width}
              canvasHeight={height}
              onAnnotationsChange={(pageAnns) => {
                // Merge: keep annotations from other pages, replace this page's
                const otherPages = textAnnotations.filter((a) => a.pageIndex !== pageIndex)
                handleTextAnnotationsChange([...otherPages, ...pageAnns])
              }}
              active={activeTool === 'text'}
            />
          </>
        )}
      />
    </div>
  )
}
