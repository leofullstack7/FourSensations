import Image from "next/image";
import Link from "next/link";
import logoIcon from "@/assets/logo.png";
import logoWide from "@/assets/logo-largo.png";

export type BrandLogoVariant = "store" | "admin" | "auth" | "icon";

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
  if (variant === "store") {
    const inner = (
      <span className="logo-wide-wrap">
        <Image
          src={logoWide}
          alt="GinnaBeauty"
          width={220}
          height={64}
          className="gb-brand-image logo-wide-image"
          priority={priority}
        />
      </span>
    );
    if (href) {
      return (
        <Link href={href} className={`logo logo--wide ${className}`.trim()}>
          {inner}
        </Link>
      );
    }
    return <div className={`logo logo--wide ${className}`.trim()}>{inner}</div>;
  }

  const iconSize = variant === "auth" ? 80 : variant === "admin" ? 44 : 72;

  const icon = (
    <Image
      src={logoIcon}
      alt="Logo GinnaBeauty"
      width={iconSize}
      height={iconSize}
      className="gb-brand-image logo-icon-image"
      priority={priority}
    />
  );

  if (variant === "icon") {
    return <div className={`logo-icon ${className}`.trim()}>{icon}</div>;
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
