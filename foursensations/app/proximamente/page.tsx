import type { Metadata } from "next";
import "./coming-soon.css";

export const metadata: Metadata = {
  title: "Pronto estaremos al aire — Four Sensations",
  description: "Four Sensations está preparando su tienda. Pronto estaremos al aire.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="fs-soon">
      <div className="fs-soon__void" />
      <div className="fs-soon__glow fs-soon__glow--a" />
      <div className="fs-soon__glow fs-soon__glow--b" />
      <div className="fs-soon__card">
        <img
          className="fs-soon__logo"
          src="/brand/splash/logo-fs.webp"
          alt="Four Sensations"
          width={220}
          height={220}
        />
        <span className="fs-soon__rule" />
        <img
          className="fs-soon__club"
          src="/brand/splash/el-club.webp"
          alt="El Club de los Cabellos Perfectos"
          width={300}
          height={80}
        />
        <h1 className="fs-soon__title">Pronto estaremos al aire</h1>
        <p className="fs-soon__text">
          Estamos preparando la tienda. Vuelve muy pronto.
        </p>
      </div>
    </main>
  );
}
