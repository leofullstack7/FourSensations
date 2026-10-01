"use client";

import Image from "next/image";
import Link from "next/link";
import labPhoto from "@/assets/foursensations/sobre-nosotros-lab.jpg";
import { MotionDiv } from "@/components/store/store-framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function AboutUsClient() {
  return (
    <main className="fs-about">
      <section className="fs-about-hero">
        <MotionDiv
          className="fs-about-hero__copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="fs-about-eyebrow">Esto es Four Sensations</p>
          <h1>
            Creamos nuevas formas de <em>amar</em> tu cabello
          </h1>
          <p className="fs-about-lead">
            Nacimos en <strong>2014 en Manizales, Colombia</strong>, con una idea que todavía nos mueve: hacer del
            cuidado capilar algo que realmente quieras vivir, disfrutar y repetir.
          </p>
        </MotionDiv>
        <MotionDiv
          className="fs-about-hero__media"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={labPhoto}
            alt="Four Sensations — ciencia, fórmulas y magia visual"
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            className="fs-about-hero__img"
          />
        </MotionDiv>
      </section>

      <section className="fs-about-story">
        {[
          {
            title: "Más que productos",
            body: "Desde entonces hemos creado fórmulas pensadas para necesidades reales, rutinas que se adaptan a diferentes tipos de cabello y todo un universo alrededor de una de nuestras cosas favoritas: sentir nuestro cabello increíble.",
          },
          {
            title: "Obsesión por el detalle",
            body: "La fórmula, la textura, el aroma, el empaque, los colores, la experiencia al abrir una caja y, sobre todo, lo que sientes cuando pruebas un producto y dices: “WOW, mi pelo necesitaba esto”. ✨",
          },
          {
            title: "Ciencia + magia visual",
            body: "Somos una marca colombiana, femenina, inquieta y profundamente creativa. Unimos ciencia, innovación y ese toque de magia visual tan nuestro para productos con propósito claro dentro de tu rutina.",
          },
        ].map((block, i) => (
          <MotionDiv
            key={block.title}
            className="fs-about-card"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, delay: i * 0.08 }}
          >
            <h2>{block.title}</h2>
            <p>{block.body}</p>
          </MotionDiv>
        ))}
      </section>

      <MotionDiv
        className="fs-about-years"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p>
          <strong>11 años después</strong>, seguimos igual de obsesionados 💗 Con crear. Con mejorar. Con escuchar a
          nuestras clientas. Con encontrar nuevas formas de cuidar el cabello y con hacer que cada lanzamiento se
          sienta especial.
        </p>
        <p>
          Porque nunca se ha tratado simplemente de vender shampoo, tratamientos o finalizadores. Se trata de crear
          esas pequeñas <em>sensaciones</em> que hacen que cuidar de ti se convierta en uno de tus momentos favoritos
          del día.
        </p>
      </MotionDiv>

      <section className="fs-about-close">
        <BrandLogo variant="store" />
        <h2>Bienvenida al Club de los Cabellos Perfectos. 🎀✨</h2>
        <p className="fs-about-be">BE YOU, BE FOUR SENSATIONS.</p>
        <Link href="/" className="btn btn-primary">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}
