'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

function getThemeSnapshot() {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function getServerSnapshot() {
  return false
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  if (typeof window !== 'undefined') {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }
  return () => observer.disconnect()
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = useCallback(() => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  return (
    <Button variant="ghost" size="icon" onClick={toggle} className="h-9 w-9">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
