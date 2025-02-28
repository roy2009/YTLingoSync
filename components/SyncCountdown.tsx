'use client'

import { useState, useEffect } from 'react'

interface SyncCountdownProps {
  nextSyncTime: string
}

export default function SyncCountdown({ nextSyncTime }: SyncCountdownProps) {
  const [countdown, setCountdown] = useState<string>('')
  
  useEffect(() => {
    const targetTime = new Date(nextSyncTime).getTime()
    
    const updateCountdown = () => {
      const now = new Date().getTime()
      const difference = targetTime - now
      
      if (difference <= 0) {
        setCountdown('即将同步')
        return
      }
      
      // 计算小时、分钟和秒数
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [nextSyncTime])
  
  return (
    <div className="text-xl font-bold text-[rgb(var(--accent-color))]">{countdown}</div>
  )
} 