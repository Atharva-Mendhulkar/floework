import React from 'react'

export interface MaintenanceBannerProps {
  active?: boolean
  message?: string
  scheduledEnd?: string
  isLockout?: boolean
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
  active = false,
  message = 'Floework is currently undergoing scheduled platform maintenance. Real-time updates may be briefly delayed.',
  scheduledEnd,
  isLockout = false
}) => {
  const [dismissed, setDismissed] = React.useState(false)

  if (!active || (dismissed && !isLockout)) {
    return null
  }

  return (
    <div
      role="alert"
      className={`w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium transition-colors ${
        isLockout
          ? 'bg-amber-600 text-white'
          : 'bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300'
      }`}
    >
      <div className="flex items-center gap-2.5 mx-auto">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span>{message}</span>
        {scheduledEnd && (
          <span className="text-xs opacity-80 font-mono">
            (Estimated completion: {new Date(scheduledEnd).toLocaleTimeString()})
          </span>
        )}
      </div>

      {!isLockout && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs opacity-75 hover:opacity-100 underline ml-4"
          aria-label="Dismiss banner"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export default MaintenanceBanner
