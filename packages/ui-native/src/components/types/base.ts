export type IBKSize = '2xs' | 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type IBKIntent = 'brand' | 'success' | 'danger' | 'warning' | 'normal';
export type IBKVariants = 'outline' | 'fill' | 'ghost';
export type IBKBreakpoints = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IBKResponsiveSize = { base: IBKSize } & Partial<Record<IBKBreakpoints, IBKSize>>;
