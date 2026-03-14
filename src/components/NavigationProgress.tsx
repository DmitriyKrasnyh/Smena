'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Route changed — complete the bar
      setWidth(100)
      const done = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
      prevPathname.current = pathname
      return () => clearTimeout(done)
    }
  }, [pathname])

  // Start progress when a link is clicked (before navigation completes)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      if (href === pathname) return

      if (timerRef.current) clearTimeout(timerRef.current)
      setVisible(true)
      setWidth(0)
      // Animate to ~80% quickly, then slow down
      requestAnimationFrame(() => {
        setWidth(15)
        timerRef.current = setTimeout(() => setWidth(60), 100)
      })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"
        style={{
          width: `${width}%`,
          transition: width === 100
            ? 'width 200ms ease-out'
            : width === 0
            ? 'none'
            : 'width 600ms cubic-bezier(0.1, 0.8, 0.2, 1)',
        }}
      />
    </div>
  )
}
