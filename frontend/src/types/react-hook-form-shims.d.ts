declare module 'react-hook-form' {
  // Minimal compatibility shims for the type names used in this codebase.
  export type FieldValues = Record<string, unknown>
  export type FieldPath<T> = Extract<keyof T, string>

  export interface ControllerProps<TFieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
    name: TName
    control?: unknown
    render?: (...args: unknown[]) => unknown
    defaultValue?: unknown
    [key: string]: unknown
  }

  export const Controller: unknown
  export const FormProvider: unknown
  export function useFormContext(): unknown
  export function useFormState(options?: { name?: string }): unknown
}
