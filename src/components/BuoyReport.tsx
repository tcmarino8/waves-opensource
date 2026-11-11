import { useEffect, useMemo, useRef, useState } from 'react'
import type { StationConfig } from '../config/stations'
import type { StationData } from '../types/buoy'
import { buildBuoyReport } from '../utils/buoyReport'

interface BuoyReportProps {
  selectedStations: StationConfig[]
  stations: StationData[]
}

export function BuoyReport({ selectedStations, stations }: BuoyReportProps) {
  const report = useMemo(() => buildBuoyReport(selectedStations, stations), [selectedStations, stations])
  const reportText = report.join('\n\n')
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const speechSupported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined'

  useEffect(() => {
    return () => {
      if (activeUtterance.current) {
        activeUtterance.current = null
        window.speechSynthesis.cancel()
      }
    }
  }, [reportText])

  useEffect(() => {
    setIsSpeaking(false)
    setSpeechError('')
  }, [reportText])

  const stopSpeaking = () => {
    activeUtterance.current = null
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const speakReport = () => {
    if (!speechSupported || activeUtterance.current) {
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(reportText)
      activeUtterance.current = utterance
      utterance.onend = () => {
        if (activeUtterance.current === utterance) {
          activeUtterance.current = null
          setIsSpeaking(false)
        }
      }
      utterance.onerror = () => {
        if (activeUtterance.current === utterance) {
          activeUtterance.current = null
          setIsSpeaking(false)
          setSpeechError('Unable to play the report. You can still read it below.')
        }
      }
      setSpeechError('')
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Unable to play buoy report:', error)
      activeUtterance.current = null
      setIsSpeaking(false)
      setSpeechError('Unable to play the report. You can still read it below.')
    }
  }

  return (
    <section className="panel" aria-labelledby="buoy-report-heading">
      <h3 id="buoy-report-heading">Buoy Conditions Report</h3>
      <p className="footer-note">
        Offshore buoy readings are not a forecast of breaking waves at the beach.
      </p>
      <div className="report-actions">
        <button
          type="button"
          className="refresh-button"
          onClick={speakReport}
          disabled={!speechSupported || isSpeaking}
        >
          Listen to report
        </button>
        <button
          type="button"
          className="refresh-button"
          onClick={stopSpeaking}
          disabled={!speechSupported || !isSpeaking}
        >
          Stop
        </button>
      </div>
      {!speechSupported && (
        <p className="footer-note">Voice playback is not available in this browser. The report is available below.</p>
      )}
      <p className="report-error" role="status">{speechError}</p>
      <div className="report-text">
        {report.map((paragraph, index) => <p key={selectedStations[index].id}>{paragraph}</p>)}
      </div>
    </section>
  )
}
