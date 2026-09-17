import "../../../../shell-loading.css";

/** Skeleton ligero mientras llega el shell de la categoría (solo zona de contenido). */
export default function CategoryLoading() {
  return (
    <div className="gb-loading-page gb-loading-page--route gb-loading-page--inline" aria-busy="true" aria-label="Cargando categoría">
      <div className="gb-loading-inner">
        <div className="gb-loading-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gb-skel-card">
              <div className="gb-skel gb-skel-card-img" />
              <div className="gb-skel gb-skel-line gb-skel-line--med" />
              <div className="gb-skel gb-skel-line gb-skel-line--short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
