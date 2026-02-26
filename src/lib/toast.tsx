import { toast as sonnerToast } from 'sonner'
import { CheckCircle, CircleX, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface CustomToastOptions {
  title?: string
  description: string
  duration?: number
}

const typeConfig = {
  success: {
    bg: 'bg-green-100',
    border: 'border-green-300',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    textColor: 'text-green-800',
    titleColor: 'text-green-600'
  },
  error: {
    bg: 'bg-red-100',
    border: 'border-red-300',
    icon: CircleX,
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    titleColor: 'text-red-600'
  },
  warning: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-800',
    titleColor: 'text-yellow-600'
  },
  info: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    icon: Info,
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
    titleColor: 'text-blue-600'
  }
}

function createCustomToast(type: ToastType, options: CustomToastOptions) {
  const config = typeConfig[type]
  const Icon = config.icon

  return sonnerToast.custom(
    (t) => (
      <div
        className={`${config.bg} ${config.border} border-2 rounded-lg p-4 shadow-lg flex items-start gap-3 min-w-[320px] max-w-[420px]`}
      >
        <Icon className={`${config.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {options.title && (
            <h3 className={`${config.titleColor} font-semibold text-sm mb-1`}>
              {options.title}
            </h3>
          )}
          <p className={`${config.textColor} text-sm leading-relaxed`}>
            {options.description}
          </p>
        </div>
        <button
          onClick={() => sonnerToast.dismiss(t)}
          className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    ),
    {
      duration: options.duration || 5000,
    }
  )
}

// Export convenient toast functions
export const toast = {
  success: (description: string, title?: string, duration?: number) => {
    return createCustomToast('success', { description, title, duration })
  },
  
  error: (description: string, title?: string, duration?: number) => {
    return createCustomToast('error', { description, title, duration })
  },
  
  warning: (description: string, title?: string, duration?: number) => {
    return createCustomToast('warning', { description, title, duration })
  },
  
  info: (description: string, title?: string, duration?: number) => {
    return createCustomToast('info', { description, title, duration })
  },

  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
    })
  },
}