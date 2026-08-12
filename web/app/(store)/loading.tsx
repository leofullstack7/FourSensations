/**
 * UI de carga de la tienda: skeleton tech con logo animado.
 */
import Image from "next/image";
import logoImage from "@/assets/logo.png";
import "../shell-loading.css";

export default function StoreLoading() {
  return (
    <div className="gb-loading-page" aria-busy="true" aria-label="Cargando tienda">
      <div className="gb-loading-inner">
        <div className="gb-loading-brand">
          <div className="gb-loading-brand-ring">
            <Image src={logoImage} alt="" width={56} height={56} priority />
          </div>
          <div className="gb-loading-pulse-bar" aria-hidden />
          <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Cargando experiencia GinnaBeauty
          </p>
        </div>
        <div className="gb-loading-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gb-skel-card">
              <div className="gb-skel gb-skel-card-img" />
              <div className="gb-skel gb-skel-line gb-skel-line--med" />
              <div className="gb-skel gb-skel-line gb-skel-line--short" />
              <div className="gb-skel gb-skel-line" style={{ width: "55%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
