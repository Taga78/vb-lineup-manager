'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function QRCodePage() {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/attend` : ''

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the print zone */
          body > *:not(#__next),
          nav, header, footer,
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
      `}</style>

      {/* Screen: back button */}
      <div className="no-print mb-6">
        <button
          onClick={() => history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
      </div>

      {/* Printable zone */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <h1 className="text-2xl font-bold">Presence Volleyball</h1>
        <p className="text-(--color-text-secondary) max-w-sm">
          Scannez ce QR code pour declarer votre presence a la seance du jour.
        </p>

        {url && (
          <div className="bg-white p-6 rounded-2xl shadow-sm inline-block">
            <QRCodeSVG value={url} size={280} level="H" />
          </div>
        )}

        <p className="text-sm text-(--color-text-secondary) font-mono">{url}</p>
      </div>

      {/* Screen: print button */}
      <div className="no-print flex justify-center mt-8">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-(--color-primary) text-white hover:bg-(--color-primary-dark) transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer cette page
        </button>
      </div>
    </>
  )
}
