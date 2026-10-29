import { createContext, useContext } from 'react';
import type { InputGroupProps } from './type';

type InputAppearance = Pick<
  InputGroupProps,
  'intent' | 'size' | 'variant' | 'disabled' | 'readOnly'
>;

export const InputGroupContext = createContext<InputAppearance | null>(null);

export function useInputAppearance(props: InputAppearance) {
  const group = useContext(InputGroupContext);
  return {
    intent: props.intent ?? group?.intent ?? 'normal',
    size: props.size ?? group?.size ?? 'base',
    variant: props.variant ?? group?.variant ?? 'outline',
    disabled: props.disabled ?? group?.disabled ?? false,
    readOnly: props.readOnly ?? group?.readOnly ?? false,
    grouped: group !== null,
  } as const;
}

export function isInputInvalid(value: InputGroupProps['aria-invalid']) {
  return value !== undefined && value !== false && value !== 'false';
}
