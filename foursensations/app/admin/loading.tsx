/**
 * UI de carga del panel admin: skeleton de tabla (solo presentación).
 */
import "../shell-loading.css";

export default function AdminLoading() {
  return (
    <div className="gb-loading-page" aria-busy="true" aria-label="Cargando administración">
      <div className="gb-loading-inner">
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
          <div className="gb-skel gb-loading-title" style={{ width: 220, marginBottom: 0 }} />
          <div className="gb-skel" style={{ width: 120, height: 36, borderRadius: 10, marginLeft: "auto" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="gb-admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <div className="gb-skel gb-skel-line" style={{ margin: 0, height: 14 }} />
                  </td>
                  <td>
                    <div className="gb-skel gb-skel-line gb-skel-line--med" style={{ margin: 0, height: 14 }} />
                  </td>
                  <td>
                    <div className="gb-skel gb-skel-line gb-skel-line--short" style={{ margin: 0, height: 14 }} />
                  </td>
                  <td>
                    <div className="gb-skel gb-skel-line gb-skel-line--short" style={{ margin: 0, height: 14, width: "60%" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
