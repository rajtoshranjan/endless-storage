import { HTMLAttributes } from 'react';

export type IconProps = HTMLAttributes<SVGElement>;

export const CustomIcons = {
  Logo: (props: IconProps) => (
    <svg
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 298 298"
      xmlSpace="preserve"
      fill="currentColor"
      {...props}
    >
      <defs>
        <mask id="infinity-mask">
          <rect width="100%" height="100%" fill="white" />
          <path
            d="M 149 160 C 130 115, 80 115, 80 160 C 80 205, 130 205, 149 160 C 168 115, 218 115, 218 160 C 218 205, 168 205, 149 160 Z"
            fill="none"
            stroke="black"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <g mask="url(#infinity-mask)">
        <path d="M199.395,58.5V0H59.228C45.442,0,33.395,11.381,33.395,25.166v247.668c0,13.785,12.048,25.166,25.833,25.166h181c13.785,0,24.167-11.381,24.167-25.166V66h-57.167C203.085,66,199.395,62.643,199.395,58.5z" />
        <polygon points="214.395,51 264.605,51 214.395,0" />
      </g>
    </svg>
  ),
};
