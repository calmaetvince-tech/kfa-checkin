import Image from "next/image";
import logo from "@/public/brand/kfa-logo.png";

// Intrinsic logo is 600x804 (portrait). Keep that aspect ratio so next/image
// reserves the right box and there's no layout shift.
const ASPECT = 804 / 600;

export function Logo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const widths = { sm: 36, md: 56, lg: 160 };
  const w = widths[size];
  const h = Math.round(w * ASPECT);
  return (
    <Image
      src={logo}
      alt="Kallistis Fight Academy"
      width={w}
      height={h}
      priority={size === "lg"}
      className={className}
      style={{ width: w, height: "auto" }}
    />
  );
}
