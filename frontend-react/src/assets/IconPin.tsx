import React from "react";

interface IconPinProps {
  className?: string;
  size?: number;
  color?: string;
}

export const IconPin: React.FC<IconPinProps> = ({
  className = "h-4 w-4",
  size = 24,
  color = "currentColor",
}) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
};

export default IconPin;
