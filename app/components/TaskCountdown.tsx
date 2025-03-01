'use client'

import { useState, useEffect } from 'react'

interface TaskCountdownProps {
  nextRunTime: string
}

export default function TaskCountdown({ nextRunTime }: TaskCountdownProps) {
  const [formattedTime, setFormattedTime] = useState<string>('')
  
  useEffect(() => {
    try {
      // 解析时间
      const date = new Date(nextRunTime)
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.error('无效的下次运行时间:', nextRunTime)
        setFormattedTime('时间格式错误')
        return
      }
      
      // 格式化为本地时间字符串 - 年-月-日 时:分:秒
      const formattedDateTime = date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      setFormattedTime(formattedDateTime)
    } catch (error) {
      console.error('格式化时间出错:', error)
      setFormattedTime('格式化错误')
    }
  }, [nextRunTime])
  
  return (
    <div className="text-[rgb(var(--accent-color))]">{formattedTime}</div>
  )
} 