export function Logo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sentinel"
    >
      {/* Diamond mark */}
      <g>
        <path
          d="M14 2 L26 14 L14 26 L2 14 Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M8 14 L12 18 L20 9"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <text
        x="36"
        y="20"
        fontFamily="Satoshi, Inter, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="-0.02em"
        fill="currentColor"
      >
        Sentinel
      </text>
    </svg>
  );
}
