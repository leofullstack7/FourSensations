/**
 * UI de carga del checkout: skeleton del formulario y resumen (sin tocar lógica de pago).
 */
import "../../shell-loading.css";

export default function CheckoutLoading() {
  return (
    <div className="gb-loading-page" aria-busy="true" aria-label="Cargando checkout">
      <div className="gb-loading-inner">
        <div className="gb-skel gb-loading-title" style={{ width: 280 }} />
        <div className="gb-checkout-loading">
          <div className="gb-checkout-panel">
            <div className="gb-skel gb-skel-line" style={{ width: "40%", height: 14, marginBottom: 20 }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="gb-skel gb-skel-line" style={{ height: 44, borderRadius: 10, marginBottom: 14 }} />
            ))}
            <div className="gb-skel gb-skel-line" style={{ height: 48, borderRadius: 12, marginTop: 8 }} />
          </div>
          <div className="gb-checkout-panel">
            <div className="gb-skel gb-skel-line" style={{ width: "50%", height: 14, marginBottom: 18 }} />
            <div className="gb-skel gb-skel-line" style={{ marginBottom: 12 }} />
            <div className="gb-skel gb-skel-line gb-skel-line--med" style={{ marginBottom: 12 }} />
            <div className="gb-skel gb-skel-line gb-skel-line--short" style={{ marginBottom: 24 }} />
            <div className="gb-skel gb-skel-line" style={{ height: 52, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
