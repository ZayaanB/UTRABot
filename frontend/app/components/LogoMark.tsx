import { useId } from "react";

export default function LogoMark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, ""); // safe id
  const gradId = `gradient-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#059669", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <polygon
        points="100,10 180,55 180,145 100,190 20,145 20,55"
        fill={`url(#${gradId})`}
        stroke="#047857"
        strokeWidth="3"
      />
    </svg>
  );
}
