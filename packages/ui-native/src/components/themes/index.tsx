import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { VariableContextProvider } from 'nativewind';
import { defaultTheme, themes, themeVariables } from './tokens';
import type { NativeTheme, ThemeName } from './tokens';

interface ThemeContextValue {
  mode: ThemeName;
  theme: NativeTheme;
  fontFamily?: string;
}
const ThemeContext = createContext<ThemeContextValue>({ mode: defaultTheme, theme: themes[defaultTheme] });
export function ThemeProvider({ mode = defaultTheme, fontFamily, children }: {
  mode?: ThemeName; fontFamily?: string; children: ReactNode;
}) {
  const value = useMemo(() => ({ mode, theme: themes[mode], fontFamily }), [mode, fontFamily]);
  return <ThemeContext.Provider value={value}>
    <VariableContextProvider value={themeVariables[mode]}>{children}</VariableContextProvider>
  </ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
export type { ThemeName, NativeTheme };
