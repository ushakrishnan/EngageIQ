declare module 'recharts' {
  // Minimal shims for Recharts payload/legend types used in the app.
  export interface TooltipPayload {
    name?: string | number
    dataKey?: string | number
    value?: number | string
    payload?: Record<string, unknown>
    color?: string
    [key: string]: unknown
  }

  export interface LegendPayload {
    value?: string | number
    dataKey?: string | number
    name?: string
    payload?: Record<string, unknown>
    color?: string
    [key: string]: unknown
  }

  export interface LegendProps {
    payload?: LegendPayload[]
    verticalAlign?: 'top' | 'bottom'
    [key: string]: unknown
  }

  export interface TooltipProps {
    payload?: TooltipPayload[]
    active?: boolean
    [key: string]: unknown
  }
}
