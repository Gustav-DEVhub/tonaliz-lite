import { create } from 'zustand'

export type ToastVariant = 'success' | 'info' | 'warning' | 'error'

export interface ToastInput {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  variant?: ToastVariant
  duration?: number
}

export interface ToastItem extends Required<Pick<ToastInput, 'title' | 'variant' | 'duration'>> {
  id: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastStore {
  toasts: ToastItem[]
  showToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_TOAST_DURATION = 3200
const MAX_VISIBLE_TOASTS = 4

function createToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = createToastId()
    const nextToast: ToastItem = {
      id,
      title: toast.title,
      description: toast.description,
      actionLabel: toast.actionLabel,
      onAction: toast.onAction,
      variant: toast.variant ?? 'info',
      duration: toast.duration ?? DEFAULT_TOAST_DURATION,
    }

    set((state) => ({
      toasts: [nextToast, ...state.toasts.filter((item) => item.title !== toast.title)].slice(0, MAX_VISIBLE_TOASTS),
    }))

    return id
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
  clearToasts: () => {
    set({ toasts: [] })
  },
}))
