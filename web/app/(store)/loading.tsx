/**
 * UI de carga de la tienda: skeleton de grid de productos (feedback inmediato al navegar).
 */
import "../shell-loading.css";

export default function StoreLoading() {
  return (
    <div className="gb-loading-page" aria-busy="true" aria-label="Cargando tienda">
      <div className="gb-loading-inner">
        <div className="gb-skel gb-loading-title" />
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
