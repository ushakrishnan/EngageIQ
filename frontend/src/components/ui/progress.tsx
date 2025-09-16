"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const id = `progress-${Math.random().toString(36).slice(2, 9)}`
  const pct = 100 - (value || 0)

  return (
    <ProgressPrimitive.Root
      ref={ref}
      data-progress-id={id}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `#${id} .indicator { transform: translateX(-${pct}%); }`,
        }}
      />
      <ProgressPrimitive.Indicator className="indicator h-full w-full flex-1 bg-primary transition-all" />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }