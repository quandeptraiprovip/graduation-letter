"use client";

import Image from "next/image";

type Props = {
  src?: string;
  alt: string;
  placeholder?: string;
  shape?: "circle" | "rect";
  className?: string;
  style?: React.CSSProperties;
};

export function ImageSlot({
  src,
  alt,
  placeholder = "Ảnh sẽ cập nhật",
  shape = "rect",
  className,
  style,
}: Props) {
  const radius = shape === "circle" ? "50%" : undefined;

  if (src) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: radius,
          ...style,
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: "var(--slot-bg, #F3E9E2)",
        color: "#A98AA0",
        fontSize: 13,
        fontWeight: 500,
        textAlign: "center",
        padding: 12,
        borderRadius: radius,
        ...style,
      }}
      aria-label={placeholder}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        style={{ opacity: 0.45 }}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span>{placeholder}</span>
    </div>
  );
}
