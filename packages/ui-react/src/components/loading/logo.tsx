import { useId } from 'react';

// Original BitKan logo paths supplied for LogoLoading.
import { LOGO_PATHS } from '@bkreact/assets/logo';

const renderLogoPaths = () => LOGO_PATHS.map((d, index) => <path key={index} d={d} />);

export function LogoLoading() {
  const clipId = `bk-loading-${useId().replace(/:/g, '')}`;
  return (
    <svg className="bkreact-loading__logo" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 360 1024 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect className="bkreact-loading__logo-reveal" x="0" y="360" width="1024" height="300" />
        </clipPath>
      </defs>
      <g className="bkreact-loading__logo-muted">{renderLogoPaths()}</g>
      <g clipPath={`url(#${clipId})`}>
        <g className="bkreact-loading__logo-overlay">{renderLogoPaths()}</g>
      </g>
    </svg>
  );
}
