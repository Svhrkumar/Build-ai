"use client"

import { useEffect, useState } from "react"

const resolveInitialValue = (initialValue) =>
  typeof initialValue === "function" ? initialValue() : initialValue

export default function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") {
      return resolveInitialValue(initialValue)
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : resolveInitialValue(initialValue)
    } catch {
      return resolveInitialValue(initialValue)
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state])

  return [state, setState]
}
