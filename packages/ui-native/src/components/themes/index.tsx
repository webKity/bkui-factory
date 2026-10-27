import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { VariableContextProvider } from 'nativewind';
import { createTheme, defaultTheme, themes, getThemeVariables } from './tokens';
import type { NativeTheme, ThemeName, ThemeOverrides } from './tokens';

interface ThemeContextValue {
  mode: ThemeName;
  theme: NativeTheme;
  fontFamily?: string;
}
const ThemeContext = createContext<ThemeContextValue>({ mode: defaultTheme, theme: themes[defaultTheme] });
export function ThemeProvider({ mode = defaultTheme, overrides, fontFamily, children }: {
  mode?: ThemeName; overrides?: ThemeOverrides; fontFamily?: string; children: ReactNode;
}) {
  const theme = useMemo(() => createTheme(mode, overrides), [mode, overrides]);
  const variables = useMemo(() => getThemeVariables(theme), [theme]);
  const value = useMemo(() => ({ mode, theme, fontFamily }), [mode, theme, fontFamily]);
  return <ThemeContext.Provider value={value}>
    <VariableContextProvider value={variables}>{children}</VariableContextProvider>
  </ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
export { createTheme };
export type { ThemeName, NativeTheme, ThemeOverrides };
