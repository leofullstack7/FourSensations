export type StoreTestimonial = {
  name: string;
  city: string;
  tag: string;
  text: string;
  initial: string;
};

/** Banco completo de testimonios reales (Juliana / guía 09). */
export const STORE_TESTIMONIALS: readonly StoreTestimonial[] = [
  { name: "Laura M.", city: "Manizales", tag: "Favorito del Club", text: "Dulce Renacer es una LOCURAAAA, mi pelo queda demasiado suave y con un brillo divino. Ya perdí la cuenta de cuántos tarros llevo jajaja.", initial: "L" },
  { name: "Mariana G.", city: "Bogotá", tag: "Cliente Frecuente", text: "El repolarizador me encanta porque me deja el pelo súper manejable. Cuando no lo uso se nota demasiado", initial: "M" },
  { name: "Valentina R.", city: "Medellín", tag: "Obsesión confirmada", text: "Amoo la proteínaaaa💗 mi cabello estaba vuelto nada después de tanta plancha y desde la primera aplicación sentí el cambio.", initial: "V" },
  { name: "Sofía C.", city: "Barranquilla", tag: "Dupla favorita", text: "Usé la bomba capilar antes del shampoo y brutaaall, recomendadoo", initial: "S" },
  { name: "Daniela P.", city: "Cali", tag: "No falta en su rutina ✨", text: "Hago la bomba una vez por semana y mi cabello lo agradece DEMASIADO. Las puntas quedan suavecitas y el pelo se siente otro.", initial: "D" },
  { name: "Natalia V.", city: "Armenia", tag: "Favorito del Club", text: "Botanical ya es fijo en mi baño jajajaja. Me encanta cómo me deja el cabello y siento la raíz demasiado limpia después de lavarlo.", initial: "N" },
  { name: "Alejandra S.", city: "Pereira", tag: "Cliente Nueva", text: "Mi pelo es seco secoooo y la proteína capilar me cayó del cielo", initial: "A" },
  { name: "Manuela T.", city: "Chía", tag: "Favorito del Club", text: "Estoy obsesionada con el bloqueador capilar, amo que no deje el cabello pesado", initial: "M" },
  { name: "Sara L.", city: "Envigado", tag: "Descubrimiento favorito ✨", text: "Tengo raíz grasa y encontrar productos para eso es un sufrimiento 😭. Botanical me funcionó demasiado bien.", initial: "S" },
  { name: "Juliana A.", city: "Ipiales", tag: "Descubrimiento favorito", text: "AMOOOO botanical que me deja la raíz limpia pero no siento las puntas resecas. Eso era exactamente lo que estaba buscando.", initial: "J" },
  { name: "Paula N.", city: "Cartagena", tag: "Momento detox", text: "La sensación de limpieza con el kit de carbón y Scrub Glow es otro niveeel", initial: "P" },
  { name: "Camila F.", city: "Ibagué", tag: "Descubrimiento favorito", text: "Yo ni sabía que necesitaba un exfoliante capilar hasta que probé este, ahora no puede faltar en mi rutina.", initial: "C" },
  { name: "Carolina B.", city: "Dosquebradas", tag: "Team cuero cabelludo feliz 💗", text: "Scrub + Scalp Therapy cuando tengo la raíz pesada y quedo NUEVAAAA jajajaj. Amo la frescura que dejan.", initial: "C" },
  { name: "Andrea H.", city: "Villavicencio", tag: "Favorito del Club", text: "El Scrub es demasiado ricoooo. Uno siente literal que le quitó al cuero cabelludo todo lo que tenía acumulado 😂", initial: "A" },
  { name: "Melissa D.", city: "Medellín", tag: "Constancia + amor", text: "He sido demasiado juiciosa con el tónico y estoy FELIZ 😭 tengo un montón de pelitos nuevos que antes no veía.", initial: "M" },
  { name: "María José P.", city: "Tunja", tag: "Ritual Nocturno", text: "Todas las noches mi tónico y a dormir jajaja. Ya se volvió automático y me encanta cómo siento mi cabello de fuerte.", initial: "M" },
  { name: "Gabriela M.", city: "Neiva", tag: "Dupla favorita", text: "El tónico con los shots es mi combo sagrado. Hasta mi peluquera me dijo que me veía muchos pelitos nuevos.", initial: "G" },
  { name: "Catalina R.", city: "Valledupar", tag: "Rutina de crecimiento", text: "Yo era cero constante con cualquier cosa para el pelo y con estos sí me juicié. Estoy demasiado feliz con el proceso.", initial: "C" },
  { name: "Luisa F.", city: "Santa Marta", tag: "Indispensable", text: "EL BLOQUEADORRR 😭 no entiendo cómo vivía sin esto jajaja. Me lo pongo todos los días antes de salir.", initial: "L" },
  { name: "María Camila S.", city: "Cúcuta", tag: "Favorito del Club", text: "Lo compré por protegerme del sol y terminé enamorada de cómo me deja el cabello. Cero pesado y me ayuda muchísimo con el frizz.", initial: "M" },
  { name: "Vanessa J.", city: "Pasto", tag: "Oficialmente indispensable ✨", text: "Si uso secador o plancha, Fantasía Natural va SÍ O SÍ. Ya me da cargo de conciencia si se me olvida 😂😂.", initial: "V" },
  { name: "Tatiana C.", city: "Calarcá", tag: "Obsesión confirmada", text: "No se como describir el brillo tan mágico que deja este óleo. Me tiene enamorada", initial: "T" },
  { name: "Lorena A.", city: "Barrancabermeja", tag: "Favorito del Club", text: "Necesito Shine Gloss tamaño litro por favor 😂. No me engrasa el pelo y las puntas quedan DIVINAS.", initial: "L" },
  { name: "Nicole V.", city: "Bucaramanga", tag: "Su combo ganador", text: "Bloqueador y Shine Gloss y puntooo. Después lo agradecen", initial: "N" },
  { name: "Marcela O.", city: "Medellín", tag: "Ese toque final 💗", text: "Shine Gloss fue el producto que no sabía que necesitaba. El que me soluciona el Look!", initial: "M" },
  { name: "Sara M.", city: "Palmira", tag: "Team dulce", text: "BloomShine huele a NIÑA ROSADAAAA 🎀 jajajaja. Si aman los olores dulces, ni lo piensen.", initial: "S" },
  { name: "Isabella C.", city: "Tuluá", tag: "Obsesión del momento", text: "Me preguntaron DOS veces el mismo día qué perfume tenía y era el del cabello 😂. BloomShine te amo.", initial: "I" },
  { name: "Laura Sofía R.", city: "Bogotá", tag: "Team tropical", text: "Golden Glow huele DELICIOSOOOO a playa, me dan ganas de echármelo cada cinco minutos jajajaja.", initial: "L" },
  { name: "Valeria G.", city: "Cali", tag: "Hair Mist favorito", text: "Scarlette es demasiado femenino y coqueto sin ser empalagoso. No sé explicarlo, solo sé que necesito otro 😂💗.", initial: "V" },
  { name: "Ana María T.", city: "Buga", tag: "Team frutal", text: "Sweet Love me sorprendió demasiado, juroo que tiene el balance perfecto", initial: "A" },
  { name: "Lina P.", city: "Medellín", tag: "Hair Mist lover ✨", text: "Empecé comprando uno y ahora tengo las cuatro fragancias 😂. Claramente necesitaba perfumes para el pelo y nadie me había avisado.", initial: "L" },
  { name: "María Paula E.", city: "Salento", tag: "Un spray y todo cambia", text: "Mi parte favorita después de arreglarme es el perfume capilar. Lo amoo", initial: "M" },
  { name: "Fernanda L.", city: "Bello", tag: "SOS favorito", text: "Mis puntas estaban pidiendo AUXILIO y luna llena con suspiros las salvaron", initial: "F" },
  { name: "Juliana M.", city: "Itagüí", tag: "Ritual nocturno", text: "El nombre SOS le queda perfecto. Cuando siento las puntas secas hago Luna Llena con Suspiros esa noche y listo.", initial: "J" },
  { name: "Alejandra C.", city: "Bogotá", tag: "Pócima Mágica lover", text: "Luna Llena + unas goticas de Suspiros y a dormir. Esa pócima es BRUJERÍA jajajajaja, amo cómo quedan mis puntas.", initial: "A" },
  { name: "Estefanía R.", city: "Medellín", tag: "Obsesión total", text: "Mis pestañas revivieron con Suspiros, y tengo las cejas divinas. Además punto a favor porque ese frasquito rinde demasiado.", initial: "E" },
  { name: "Angie V.", city: "Ibagué", tag: "Puntas felices", text: "Tengo el pelo decolorado y mis puntas sufren muchísimo. Luna llena y Suspiros se volvieron mi salvavidas cuando las siento resecas.", initial: "A" },
  { name: "Paula Andrea G.", city: "Cali", tag: "Pre-shampoo lover", text: "Desde que hago pre-shampoo entendí por qué hablaban tanto de eso. Dulce Renacer y repolarizador antes de lavar = OTRO PELO.", initial: "P" },
  { name: "Natalia M.", city: "Buga", tag: "Ritual antes del lavado", text: "Yo antes me echaba shampoo y ya jajajaj. Ahora gracias a FS hago mi pre-shampoo juiciosa y no quiero volver atrás.", initial: "N" },
  { name: "Laura V.", city: "Cartagena", tag: "Glow corporal", text: "Explosión de Chocolate huele demasiado ricoooo, me dan ganas de comérmelo🍫 y la piel queda suavecita y super luminosa", initial: "L" },
  { name: "Mariana D.", city: "Manizales", tag: "Momento de consentirse", text: "El exfoliante corporal está infravaloradooo. La piel queda deliciosa.", initial: "M" },
  { name: "Daniela G.", city: "Pereira", tag: "Accesorio indispensable", text: "Pareceré la abuelita de Piolín pero NO ME IMPORTA 😂😂 cómo amanece mi pelo con el gorrito de seda vale totalmente la pena.", initial: "D" },
  { name: "Sofía M.", city: "Dosquebradas", tag: "No duerme sin él", text: "Mi novio se burla de mi gorrito y yo feliz jajajaj. Amanezco con muchísimo menos frizz y ya no duermo sin él.", initial: "S" },
  { name: "Carolina P.", city: "Manizales", tag: "Favorito de ducha", text: "El masajeador parece una bobadita hasta que uno lo prueba 😂. Ahora lavarme el pelo sin él se siente rarísimo.", initial: "C" },
  { name: "Manuela R.", city: "Medellín", tag: "Hair day essential", text: "El cepillo desenredante me sorprendió demasiado. Tengo muchísimo pelo y por fin no siento que estoy peleando con él cada vez que me peino", initial: "M" },
  { name: "Laura C.", city: "Montería", tag: "Rutina completa", text: "Yo llegué por el bloqueador y terminé con media Four Sensations en el baño 😭😂. CERO arrepentimientos", initial: "L" },
  { name: "Valentina S.", city: "Medellín", tag: "Fourlover oficialmente", text: "Mi problema con Four Sensations es que entro a comprar UNA cosa y siempre encuentro otra que necesito jajajajaja LOS AMOO💗", initial: "V" },
  { name: "María Fernanda A.", city: "Bogotá", tag: "Del carrito a sus favoritos", text: "Lo que más amo es que no es comprar por comprar. Me explicaron qué usar, en qué orden y para qué era cada cosa. Eso hace demasiada diferencia", initial: "M" },
  { name: "Sara G.", city: "Cali", tag: "Rutina personalizada", text: "Les escribí porque literalmente no sabía qué comprar 😂 les conté cómo tenía el cabello y me ayudaron a armar toda mi rutina. AMÉ!!", initial: "S" },
  { name: "Camila M.", city: "Bogotá", tag: "Oficialmente una Fourlover 🎀", text: "Llegué por Instagram, compré por probar, me cambié de la marca que llevaba años usando y aquí sigoooo. Ya tengo mis favoritos y cuando se me está acabando algo entro en pánico jajajaja.", initial: "C" },
];

/** Elige 3–6 testimonios rotando por día (mismo visitante ve set estable; días distintos varían). */
export function pickRotatingTestimonials(count = 3): StoreTestimonial[] {
  const n = Math.min(Math.max(count, 3), 6);
  const day = Math.floor(Date.now() / 86_400_000);
  const start = day % STORE_TESTIMONIALS.length;
  const out: StoreTestimonial[] = [];
  for (let i = 0; i < n; i++) {
    out.push(STORE_TESTIMONIALS[(start + i * 7) % STORE_TESTIMONIALS.length]!);
  }
  return out;
}
