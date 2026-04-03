'use client'
import React from 'react'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useEffect } from 'react'

const PageClient: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => {
    setHeaderTheme(null)
  }, [setHeaderTheme])
  return <React.Fragment />
}

export default PageClient
