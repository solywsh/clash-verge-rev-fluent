import { Toast, ToastTitle } from '@fluentui/react-components'
import { ReactNode } from 'react'

interface InnerProps {
  type: string
  duration?: number
  message: ReactNode
  isDark?: boolean
  onClose: () => void
}

interface NoticeInstance {
  (props: Omit<InnerProps, 'onClose'>): void

  info(message: ReactNode, duration?: number, isDark?: boolean): void
  error(message: ReactNode, duration?: number, isDark?: boolean): void
  success(message: ReactNode, duration?: number, isDark?: boolean): void
}

// @ts-expect-error info/error/success 由下方的 forEach 补齐，赋值时还不满足 NoticeInstance
export const Notice: NoticeInstance = (props) => {
  dispatchToast(
    <Toast>
      <ToastTitle>{props.message}</ToastTitle>
    </Toast>,
    { toasterId: 'toaster', intent: props.type },
    document,
  )
}

;(['info', 'error', 'success'] as const).forEach((type) => {
  Notice[type] = (message, duration) => {
    setTimeout(() => Notice({ type, message, duration }), 0)
  }
})

let counter = 0

type ShowToastEventDetail = any
type ToastOptions = any

export const EVENTS = {
  show: 'fui-toast-show',
  dismiss: 'fui-toast-dismiss',
  dismissAll: 'fui-toast-dismiss-all',
  update: 'fui-toast-update',
  pause: 'fui-toast-pause',
  play: 'fui-toast-play',
} as const

function dispatchToast(
  content: unknown,
  options: Partial<ToastOptions> = {},
  targetDocument: Document,
) {
  const detail: ShowToastEventDetail = {
    ...options,
    content,
    toastId: options.toastId ?? (counter++).toString(),
  }
  const event = new CustomEvent<ShowToastEventDetail>(EVENTS.show, {
    bubbles: false,
    cancelable: false,
    detail,
  })
  targetDocument.dispatchEvent(event)
}
