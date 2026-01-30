import { toast } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export function useToast() {
  return {
    addToast: (message: string, type: ToastType = 'info') => {
      toast[type](message)
    },
  }
}
