/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ReactNode } from 'react'
import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type DialogContextValue = {
  open: boolean
  setOpen: (value: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Dialog>`)
  }
  return ctx
}

type DialogProps = {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}

function Dialog({ children, open: openProp, onOpenChange, defaultOpen = false }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  const setOpen = (value: boolean) => {
    onOpenChange?.(value)
    if (openProp === undefined) {
      setUncontrolledOpen(value)
    }
  }

  const value = useMemo(() => ({ open, setOpen }), [open])

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type DialogTriggerProps = {
  children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>
  asChild?: boolean
}

const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(function DialogTrigger(
  { children },
  _ref
) {
  const { setOpen } = useDialogContext('DialogTrigger')
  const child = React.Children.only(children) as React.ReactElement<{
    onClick?: (event: React.MouseEvent) => void
  }>
  return React.cloneElement(child, {
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(true)
      }
    },
  })
})

type DialogContentProps = React.ComponentProps<'div'> & {
  children: ReactNode
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, children, ...props },
  ref
) {
  const { open, setOpen } = useDialogContext('DialogContent')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (!open) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-2xl rounded-2xl border bg-card text-card-foreground shadow-2xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
})

type DialogHeaderProps = React.ComponentProps<'div'>
const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(function DialogHeader(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
  )
})

type DialogFooterProps = React.ComponentProps<'div'>
const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(function DialogFooter(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-wrap items-center justify-end gap-3 pt-4', className)}
      {...props}
    />
  )
})

type DialogTitleProps = React.ComponentProps<'h3'>
const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  { className, ...props },
  ref
) {
  return (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
})

type DialogDescriptionProps = React.ComponentProps<'p'>
const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground leading-relaxed', className)}
        {...props}
      />
    )
  }
)

type DialogCloseProps = {
  children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>
}

const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { children },
  _ref
) {
  const { setOpen } = useDialogContext('DialogClose')
  const child = React.Children.only(children) as React.ReactElement<{
    onClick?: (event: React.MouseEvent) => void
  }>
  return React.cloneElement(child, {
    onClick: (event: React.MouseEvent) => {
      child.props.onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(false)
      }
    },
  })
})

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
