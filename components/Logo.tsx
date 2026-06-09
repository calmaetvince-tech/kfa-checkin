import Image from "next/image";
import logo from "@/public/brand/kfa-logo.png";

export function Logo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const widths = { sm: 36, md: 56, lg: 160 };
  const w = widths[size];
  return (
    <Image
      src={logo}
      alt="Kallistis Fight Academy"
      width={w}
      height={w}
      priority={size === "lg"}
      className={`h-auto ${className}`}
      style={{ width: w, height: "auto" }}
    />
  );
}
