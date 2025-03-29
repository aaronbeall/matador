import { SvgIcon, SvgIconProps } from '@mui/material';

export const Logo = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 100 100">
    <path 
      d="M50 2 L95 15 V40 Q95 80 50 98 Q5 80 5 40 V15 Z" 
      fill="currentColor"
    />
    <g stroke="primary" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M25 35 Q15 15 35 15" />
      <path d="M75 35 Q85 15 65 15" />
      <path d="M35 35 Q50 55 65 35" />
      <path d="M35 35 Q30 55 50 75 Q70 55 65 35" />
    </g>
  </SvgIcon>
);
