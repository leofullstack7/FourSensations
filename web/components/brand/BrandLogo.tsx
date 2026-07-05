import Image from "next/image";
import Link from "next/link";
import logoImage from "@/app/logo.png";

export type BrandLogoVariant = "store" | "admin" | "auth";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  href?: string | null;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = "store",
  href = variant === "store" ? "/" : null,
  priority = variant === "store",
  className = "",
}: BrandLogoProps) {
  const iconSize = variant === "auth" ? 80 : variant === "admin" ? 44 : 86;

  const icon = (
    <Image
      src={logoImage}
      alt="Logo GinnaBeauty"
      width={iconSize}
      height={iconSize}
      className="gb-brand-image logo-icon-image"
      priority={priority}
    />
  );

  if (variant === "store") {
    const inner = (
      <>
        <div className="logo-icon">{icon}</div>
        <div className="logo-text">
          <span className="logo-brand">
            Ginna<em>Beauty</em>
          </span>
          <span className="logo-tagline">Cosmética Premium</span>
        </div>
      </>
    );
    if (href) {
      return (
        <Link href={href} className={`logo ${className}`.trim()}>
          {inner}
        </Link>
      );
    }
    return <div className={`logo ${className}`.trim()}>{inner}</div>;
  }

  if (variant === "admin") {
    return (
      <div className={`admin-logo ${className}`.trim()}>
        <div className="admin-logo-mark">{icon}</div>
        <span className="admin-logo-text">
          Ginna<em>Beauty</em>
        </span>
      </div>
    );
  }

  return (
    <div className={`auth-logo gb-auth-brand ${className}`.trim()}>
      <div className="gb-auth-brand-icon">{icon}</div>
      <div className="gb-auth-brand-name">
        Ginna<em>Beauty</em>
      </div>
      <div className="gb-auth-brand-tagline">Cosmética Premium</div>
    </div>
  );
}
