'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

interface BarcodeScannerProps {
  onScan: (isbn: string) => void
  onError?: (error: string) => void
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const t = useTranslations('isbnLookup')
  const [isStarting, setIsStarting] = useState(true)
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasScannedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (!mounted) return

        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        })

        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 120 },
            aspectRatio: 1.777778,
            disableFlip: true,
          },
          (decodedText) => {
            if (hasScannedRef.current) return
            hasScannedRef.current = true
            onScan(decodedText)
          },
          () => {},
        )

        if (mounted) {
          setIsStarting(false)
        }
      } catch (err) {
        if (!mounted) return
        setIsStarting(false)

        const message = err instanceof Error ? err.message.toLowerCase() : String(err)

        if (message.includes('permission') || message.includes('notallowederror')) {
          onError?.(t('cameraPermissionDenied'))
        } else if (
          message.includes('notfounderror') ||
          message.includes('no camera') ||
          message.includes('requested device not found')
        ) {
          onError?.(t('cameraNotFound'))
        } else {
          onError?.(t('scannerError'))
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {})
        } catch {
          // Scanner was not running yet
        }
      }
    }
  }, [onScan, onError, t])

  return (
    <div className="space-y-2">
      <div ref={containerRef} id="barcode-reader" className="overflow-hidden rounded-lg" />
      {isStarting && <p className="text-center text-sm text-muted-foreground">{t('scanning')}</p>}
      {!isStarting && (
        <p className="text-center text-sm text-muted-foreground">{t('pointCamera')}</p>
      )}
    </div>
  )
}
