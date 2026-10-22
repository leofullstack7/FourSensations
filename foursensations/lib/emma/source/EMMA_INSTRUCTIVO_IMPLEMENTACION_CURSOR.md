# EMMA — Especificación de implementación para Cursor

**Proyecto:** FOUR SENSATIONS — Asesora capilar Emma  
**Versión:** 1.0 · 22 de octubre de 2026  
**Estado:** especificación funcional y técnica para implementar y validar; no implica que la web ya esté modificada.

> **INSTRUCCIÓN PARA CURSOR:** Lee este documento y los dos libros de Excel finales adjuntos ANTES de modificar código. Inspecciona el repositorio, identifica framework, CMS, sistema de productos, carrito, autenticación y panel administrativo. Diseña una implementación compatible con la arquitectura existente, sin sustituir módulos funcionales ni inventar identificadores de productos. Presenta el plan de cambios, luego implementa por etapas y ejecuta las pruebas. Si falta un SKU, precio, claim validado, permiso o integración, márcalo como pendiente de configuración: no lo inventes.

## 0. Fuentes y precedencia

Archivos fuente:

1. `Matriz_Respuestas_Emma_Four_Sensations_FINAL_P1.xlsx`: saludo, seis preguntas, opciones, reacciones, validaciones y selector de lavado.
2. `Emma_Motor_Recomendacion_Four_Sensations_FINAL_P1.xlsx`: asociaciones producto/respuesta, prioridades, catálogo, desempates, explicaciones, algoritmo y pruebas.

**Precedencia ante contradicciones:** (a) la regla final explícita de la propietaria y las hojas `REGLA FINAL P1 Y ALTERNATIVA` y `Lógica de elección lavado`; (b) este documento; (c) demás hojas de los Excel. Si una regla antigua dice «Scalp sustituye automáticamente la base», queda **derogada**. Registrar cualquier otra contradicción en un reporte de implementación, sin resolverla silenciosamente.

## 1. Objetivo y principios no negociables

Emma es una asesora cosmética guiada, no un diagnóstico médico ni un generador aleatorio de productos. Debe interpretar las **seis respuestas completas**, identificar una **base de lavado permanente según P1**, priorizar la **necesidad número uno de P5**, considerar síntomas adicionales de P3/P4 y exposición de P6, y entregar una rutina **selectiva**. Una rutina válida puede tener **solo 2 o 3 productos/módulos** si no se justifican más; **nunca rellenar hasta 5**. La recomendación principal debe ser verificable y cada producto debe explicar qué respuesta lo activó.

Prohibido: recomendar siempre los mismos productos; recomendar Botanical como detox, anticaspa o regulador de grasa; reemplazar en silencio la base de P1; incluir dos kits de lavado obligatorios; asumir que un proceso químico implica daño; prometer curación de caspa/alopecia o crecimiento garantizado; generar afirmaciones cosméticas no aprobadas; recomendar por margen comercial si no hay pertinencia.

## 2. Experiencia de clienta y flujo

### 2.1 Inicio

**Emma:** «Hola, soy Emma 💗 Antes de recomendarte una rutina, quiero conocer un poquito de tu cabello. Son unas preguntitas súper fáciles y al final te muestro qué productos Four Sensations elegiría para ti. ¿Empezamos?»

Botón: **«Sí, conozcamos mi cabello 💗»**.

### 2.2 Seis preguntas

**P1 · Única, obligatoria.** «Empecemos por lo básico 👀 ¿Cómo sientes normalmente tu cabello y cuero cabelludo?» Opciones: `Seco`, `Graso`, `Normal`, `Con caspa o acumulación`. **Eliminar `Mixto`**. El cuarto botón no es una clasificación universal de tipo de cabello, sino una necesidad de cuero cabelludo; respetar esa decisión comercial y aclarar su alcance en la UI cuando corresponda.

**P2 · Múltiple.** «Ahora cuéntame un poquito de su historia 💗 ¿Tu cabello tiene actualmente alguno de estos procesos?» Opciones: `Natural / sin procesos`, `Tinte`, `Decoloración o balayage`, `Keratina o alisado`. `Natural` es excluyente. P2 es contexto; **peso 0** para recomendación automática, no atribuir daño.

**P3 · Múltiple.** «Ahora sí, cuéntame qué estás sintiendo en tu cabello. Puedes marcar todo lo que aplique». Opciones: `Resequedad`, `Frizz`, `Opacidad y poco brillo`, `Daño y porosidad`, `Quiebre y debilidad`, `Puntas maltratadas`, `Se enreda fácilmente`. Guardar cada señal por separado; no colapsar todas en una sola categoría que produzca siempre el mismo resultado.

**P4 · Múltiple.** «Ahora vamos a la raíz: ¿notas alguna de estas situaciones en tu cuero cabelludo?» Opciones: `Exceso de grasa`, `Caspa`, `Descamación`, `Acumulación o pesadez`, `Caída`, `Crecimiento lento`, `Ninguno`. `Ninguno` es excluyente. **Caspa** y **descamación** pueden registrarse por separado; **acumulación o pesadez** es una opción compuesta.

**P5 · Única, obligatoria.** «Ya te voy conociendo, pero si pudieras mejorar una sola cosa de tu cabello primero, ¿cuál sería?» Opciones: `Repararlo`, `Nutrirlo o hidratarlo`, `Controlar grasa`, `Cuidar caspa o descamación`, `Fortalecer y cuidar la caída`, `Favorecer el crecimiento`, `Controlar el frizz`, `Tener más brillo`, `Reparar mis puntas`. Es la prioridad **más fuerte** del motor, pero no borra P1.

**P6 · Múltiple.** «Última, prometido 💗 ¿A cuáles de estas cosas expones tu cabello con frecuencia?» Utilizar **las opciones exactas** de la matriz Excel; entre ellas calor frecuente (plancha/secador/rizador). Si la matriz permite `Ninguna`, debe ser excluyente. No inventar otras exposiciones como opciones oficiales. P6 justifica protección cuando corresponda; no debe introducir productos indiscriminadamente.

**Reacciones:** mostrar **una sola respuesta breve por pregunta al pulsar Continuar**, no una reacción por cada checkbox. Conservar los textos exactos aprobados de la hoja `Reacciones combinadas` y `Opciones y respuestas`. No recomendar antes de terminar P6. Permitir retroceder y corregir; recalcular desde cero al cambiar una respuesta.

### 2.3 Resultado

Transición: «Emma está armando tu rutina ✨». Después mostrar:

1. Mensaje que sintetice P1, P5 y, si aportan, P3/P4/P6, sin inventar síntomas.
2. **Tu base de lavado**: siempre la de P1.
3. **Alternativa de lavado**: solo cuando P4/P5 la justifique; claramente identificada como **opcional**, con elección excluyente.
4. **Tu prioridad principal**: productos mejor sustentados por P5.
5. Otros tratamientos/protección solo si hay evidencia en las respuestas.
6. Bloque opcional **«La cerecita del helado»** para un Hair Mist; no contarlo como producto necesario ni confundirlo con Shine Gloss o Fantasía Natural.
7. Botones `¿Por qué para mí?`, `Cómo usar mi rutina` y `Agregar mi rutina al carrito`; carrito editable.

## 3. Regla inmutable de lavado (P1)

| P1 | Base principal **siempre visible** |
|---|---|
| Seco | Kit Tentación Nutrición |
| Graso | Kit Tentación Equilibrio |
| Normal | Shampoo Botanical |
| Con caspa o acumulación | Kit Scalp Therapy (shampoo + acondicionador de carbón activado) |

**Nunca se elimina ni sustituye automáticamente esta base.** Si P4 marca `Exceso de grasa`, `Caspa`, `Descamación` o `Acumulación o pesadez`, o P5 selecciona `Controlar grasa` o `Cuidar caspa o descamación`, y la base P1 **no** es Scalp Therapy, mostrar **Kit Scalp Therapy como alternativa** explicada, no como segundo kit obligatorio. Si Scalp ya es la base, no duplicarlo. La base P1 se muestra seleccionada por defecto; la clienta puede escoger la alternativa. **Solo uno de los sistemas de lavado entra al carrito**. Cambiar la elección debe actualizar el subtotal y las instrucciones de uso. Si P4 solo marca caída/crecimiento, no activar Scalp por esa razón.

Ejemplo de copy condicionado: «Como me contaste que tu cabello es graso, mi primera elección es **Tentación Equilibrio**. Pero como también mencionaste caspa y descamación, puedes elegir **Scalp Therapy** como alternativa para tu lavado y complementar tu rutina con **Scrub Glow**». No decir que ambos kits son necesarios.

## 4. Matriz de asociación de necesidades y productos

Las siguientes son **candidaturas**, no una instrucción de mostrarlos todos. El motor elige protagonistas y complementos relevantes según la prioridad, las coincidencias y los límites.

| Origen | Respuesta | Productos candidatos |
|---|---|---|
| P3 | Resequedad | Dulce Renacer; Repolarizador Sensación Primaveral; Proteína Capilar 10 en 1; Fantasía Natural; Shine Gloss |
| P3 | Frizz | Proteína Capilar 10 en 1; Fantasía Natural; Shine Gloss |
| P3 | Opacidad y poco brillo | Proteína Capilar 10 en 1; Fantasía Natural; Shine Gloss |
| P3 | Daño y porosidad | Dulce Renacer; Repolarizador Sensación Primaveral; Proteína Capilar 10 en 1 |
| P3 | Quiebre y debilidad | Dulce Renacer; Repolarizador Sensación Primaveral; Proteína Capilar 10 en 1; Luna Llena |
| P3 | Puntas maltratadas | Luna Llena; Suspiros; Shine Gloss |
| P3 | Se enreda fácilmente | Dulce Renacer; Repolarizador Sensación Primaveral; Fantasía Natural; Proteína Capilar 10 en 1; Shine Gloss |
| P4 | Exceso de grasa | Scalp Therapy como alternativa de lavado si no es base P1 |
| P4 | Caspa o descamación | Scalp Therapy como alternativa; Scrub Glow como complemento |
| P4 | Acumulación o pesadez | Scalp Therapy como alternativa; Scrub Glow como complemento |
| P4 | Caída | Tónico Secreto de Primavera; Shots Capilares |
| P4 | Crecimiento lento | Tónico Secreto de Primavera; Shots Capilares |
| P5 | Repararlo | Luna Llena; Dulce Renacer; Repolarizador; Proteína 10 en 1 (desempatar con P3) |
| P5 | Nutrirlo o hidratarlo | Dulce Renacer; Repolarizador; Proteína 10 en 1 |
| P5 | Controlar grasa | Scalp Therapy como alternativa; conservar base P1 |
| P5 | Cuidar caspa o descamación | Scalp Therapy como alternativa; Scrub Glow |
| P5 | Fortalecer y cuidar la caída | Tónico Secreto de Primavera; Shots Capilares |
| P5 | Favorecer el crecimiento | Tónico Secreto de Primavera; Shots Capilares |
| P5 | Controlar el frizz | Repolarizador; Dulce Renacer; Shine Gloss; Fantasía Natural; Proteína 10 en 1 |
| P5 | Tener más brillo | Shine Gloss |
| P5 | Reparar mis puntas | Luna Llena; Suspiros |
| P6 | Calor frecuente | Fantasía Natural, según función de protección y ficha aprobada |

**Precisión comercial:** Scalp Therapy es la línea que Emma puede presentar para limpieza de cuero cabelludo, grasa, caspa/descamación y acumulación, **sin prometer tratar enfermedades**. Scrub Glow es un exfoliante capilar, no un sustituto del shampoo. Botanical se justifica como base de lavado de P1 Normal, **nunca como detox o anticaspa**. Los productos de caída/crecimiento son cosméticos: no prometer tratamiento de alopecia.

## 5. Algoritmo determinístico y explicable

Separar **selección de lavado**, **ranking de tratamientos** y **presentación comercial**. No usar un modelo generativo para elegir libremente productos; si se usa IA para redactar, debe recibir solo las recomendaciones y razones ya calculadas por el motor, con claims permitidos.

### 5.1 Normalización

- Entrada tipada: `p1: enum`, `p2: enum[]`, `p3: enum[]`, `p4: enum[]`, `p5: enum`, `p6: enum[]`.
- Validar pertenencia a opciones publicadas y cardinalidad; rechazar códigos desconocidos.
- `Natural` (P2) y `Ninguno` (P4/P6 si existe) excluyen otros valores de su pregunta.
- Usar IDs estables, no comparar textos visibles; persistir versiones del cuestionario y reglas.
- P3/P4 multiselección: conservar señales individuales para justificar; limitar su efecto para evitar que marcar todo produzca siempre el mismo kit.

### 5.2 Reglas de decisión

1. **Fijar `base_p1`** con el mapa de §3; registrar razón `P1`.
2. **Calcular `alternative_wash`** según P4/P5; no sobrescribir `base_p1`.
3. **Activar candidatos P5** como protagonistas con mayor prioridad; si P5 es reparación, usar las señales específicas P3 para desempatar (puntas → Luna Llena; daño/porosidad/quiebre → Repolarizador/Dulce/Proteína según hoja `Desempates por prioridad`).
4. **Añadir cobertura de P4** para necesidades reales no cubiertas por P5 (p. ej., Tónico/Shots si hay caída; Scrub Glow si hay descamación/acumulación). Evitar duplicados.
5. **Añadir cobertura P3** seleccionando solo tratamientos que resuelvan señales relevantes. Si varias señales apuntan a Dulce Renacer y Repolarizador, priorizar uno cuando la rutina sea corta; permitir el segundo solo si cumple un rol complementario claro.
6. **Evaluar P6**: incluir protección cuando la exposición declarada lo justifique y no sea redundante. No insertar Fantasía Natural por defecto en todas las rutinas.
7. **Recortar por pertinencia**, no por orden arbitrario. Objetivo variable **2–5 módulos**, sin mínimo forzado de tres. Un kit es **un módulo comercial** pero contiene sus productos reales para carrito/precio. Tónico + Shots puede presentarse como dupla cuando se justifique, con ambos SKUs explícitos. Alternativa de lavado y Hair Mist son bloques aparte.
8. Cada producto seleccionado debe incluir `evidence` (pregunta + respuesta), `reason_code`, `rank`, `role`, `claim_ids` y `rule_version`.

### 5.3 Prioridades y desempates

- **P5** tiene precedencia para decidir el tratamiento protagonista; **P1** es inmutable para base de lavado; **P4** identifica necesidades específicas de cuero cabelludo; **P3** personaliza fibra y puntas; **P6** protege frente a exposición; **P2** solo contexto.
- La hoja `Desempates por prioridad` del motor es la fuente de desempates específicos. Los puntajes configurables son una herramienta interna, **no sustituyen** reglas duras ni permiten que un producto gane por acumular checkboxes equivalentes.
- No sumar la misma señal dos veces; no permitir que P3 «todas» monopolice los puestos y expulse P5.
- Si no hay evidencia suficiente para un complemento, **no recomendarlo**.
- Si no hay disponibilidad, marcar producto agotado y ofrecer alternativa **solo si existe una equivalencia aprobada**; nunca sustituir silenciosamente ni inventar stock.

### 5.4 Pseudocódigo de referencia

```ts
function recommend(a: EmmaAnswers, kb: PublishedKnowledge): Recommendation {
  validateAnswers(a, kb.questionnaire);
  const baseWash = kb.washBaseByP1[a.p1]; // OBLIGATORIA, nunca sobrescribir
  const needsScalp = hasAny(a.p4, ['exceso_grasa','caspa','descamacion','acumulacion_pesadez'])
    || ['controlar_grasa','cuidar_caspa_descamacion'].includes(a.p5);
  const alternativeWash = needsScalp && baseWash !== 'kit_scalp_therapy'
    ? 'kit_scalp_therapy' : null;
  const candidates = generateCandidatesFromP3P4P5P6(a, kb.rules);
  const ranked = rankWithHardConstraintsAndEvidence(candidates, a, kb);
  const selected = selectMinimalRelevantModules(ranked, {
    mandatoryWash: baseWash,
    priority: a.p5,
    maxModules: 5,
    minModules: 2, // techo/piso de presentación, NO obliga a agregar productos injustificados
    neverPad: true
  });
  return explainAndPresent({baseWash, alternativeWash, selected, hairMistOptional: true}, a, kb);
}
```

**Nota:** si solo la base de lavado está justificada y no hay evidencia para un segundo módulo, **no inventar** otro: `minModules` es un objetivo de UX, no una restricción que venza `neverPad`.

## 6. «¿Por qué para mí?» — explicación trazable

Generar la explicación **desde razones codificadas**, no mediante una frase genérica por producto. Estructura: «Elegí [producto] porque en [P#] me contaste [respuesta concreta]. Su función en tu rutina es [beneficio cosmético aprobado]». Solo usar respuestas realmente seleccionadas. Ejemplos:

- **Botanical:** «Lo elegí como base de lavado porque me contaste que tu cabello es normal». **Nunca** «detox», «para caspa» ni «controla la grasa».
- **Tentación Equilibrio:** «Lo elegí como base porque me contaste que tu cabello es graso».
- **Scalp Therapy alternativa:** «Como también mencionaste caspa/descamación/acumulación, puedes elegir este kit como alternativa de lavado»; no decir que sustituye la base automáticamente.
- **Scrub Glow:** «Lo incluí como complemento porque marcaste descamación o acumulación»; no afirmar que cura caspa.
- **Tónico + Shots:** «Los elegí porque tu prioridad es fortalecer y cuidar la caída»; no afirmar regeneración o crecimiento garantizado.
- **Dulce Renacer:** justificar por resequedad/daño/enredos o nutrición, **solo si se seleccionó**.
- **Shine Gloss:** justificar por opacidad, frizz, brillo o puntas según señal real; no incluir universalmente.

Si un producto carece de evidencia, **fallar la validación y retirarlo** del resultado antes de mostrarlo. Guardar un log de razones para auditoría.

## 7. Panel de administración — «Centro de Emma»

Agregar un módulo visible **solo a roles autorizados** dentro del administrador actual, con estas secciones:

### 7.1 Base de conocimientos y catálogo

CRUD de fichas de productos vinculadas a IDs/SKUs reales del e-commerce: nombre público, familia, rol (lavado/tratamiento/raíz/protección/acabado), formato (kit/producto/dupla), beneficios cosméticos aprobados, necesidades válidas P3/P4/P5/P6, exclusiones, incompatibilidades, condiciones de uso, instrucciones, imagen, URL, disponibilidad, activo/inactivo, orden de visualización y fecha de revisión. **Precio y stock deben venir de la tienda** como fuente de verdad. Kits deben mapear sus SKUs/componentes.

**Agregar un producto nuevo** no debe hacerlo automáticamente recomendable: flujo `Borrador → Validación → Simulación → Aprobación → Publicación`. El administrador marca qué respuestas lo activan, qué prioridad satisface, si es protagonista o complemento, qué productos desplaza o complementa y qué textos puede afirmar. Debe requerir prueba de escenarios antes de publicar.

### 7.2 Editor de reglas y prioridades

Interfaz controlada (sin editar código) para cambiar asociaciones respuesta-producto, pesos secundarios, desempates, módulos, alternativas, límites y exclusiones. Las **reglas inmutables** (base P1 siempre visible, Scalp solo alternativa salvo P1 Scalp, selector exclusivo, claims permitidos) requieren permisos elevados y validaciones especiales. Mostrar advertencias cuando una edición afecte muchos escenarios.

### 7.3 Editor conversacional

Gestionar preguntas, botones, respuestas breves, textos de transición, copy «¿Por qué para mí?», CTA y variantes de tono. Validar unicidad de IDs y exclusividad de opciones. No permitir publicar cuestionarios que el motor no pueda interpretar. Guardar versión del cuestionario.

### 7.4 Simulador de Emma

Formulario interno para seleccionar P1–P6 y ver: base, alternativa, módulos, productos excluidos, puntajes/razones, orden de rutina, copy, carrito y pasos de uso. Botón «Comparar contra versión publicada». Escenarios guardables y ejecutables en lote. Incluir todos los casos de los Excel y los casos de §9.

### 7.5 Control de calidad y auditoría

- Historial de cambios con autor, fecha, antes/después, motivo y versión.
- Publicación transaccional: la versión se activa completa, no parcialmente.
- Restaurar versión anterior con autorización.
- Reporte de productos recomendados sin evidencia, duplicados, alternativas mal clasificadas y claims no autorizados.
- Métricas: inicio/finalización del test, abandono por pregunta, distribución P1/P5, tasa de selección de alternativa, productos recomendados, clic «¿Por qué?», agregar al carrito y conversión (si la política de datos y consentimiento lo permiten).
- No guardar nombres, correos ni datos sensibles en logs de diagnóstico salvo necesidad justificada; minimizar y anonimizar respuestas.

### 7.6 Roles y seguridad

`Emma Viewer` (consulta), `Emma Editor` (borradores), `Emma Approver` (publica), `Admin` (roles/configuración). Autorización del lado servidor, validación de payloads, protección CSRF según stack, logs auditables, rate limiting de endpoints públicos. Nunca permitir que un texto de ficha de producto o entrada del cliente ejecute instrucciones de sistema o cambie reglas.

## 8. Arquitectura sugerida (adaptar al repositorio)

Separar capas:

- **Frontend de Emma:** cuestionario accesible, progreso, validaciones, estado de sesión, resultados, selector exclusivo de lavado, carrito, explicaciones.
- **Motor determinístico:** funciones puras `normalize → match → rank → constrain → explain`; pruebas unitarias, sin dependencias de UI.
- **Knowledge repository:** reglas y fichas versionadas en base de datos; caché de versión publicada; esquema validado.
- **Admin API/UI:** borradores, publicación, simulador, historial y roles.
- **Integración e-commerce:** consultar SKUs, stock, precios y acciones del carrito; no duplicar lógica de inventario.
- **Observabilidad:** errores, versión de reglas, códigos de justificación y pruebas de regresión.

Modelo conceptual mínimo:

```ts
type EmmaAnswers = {
  p1: 'seco'|'graso'|'normal'|'caspa_acumulacion';
  p2: string[]; p3: string[]; p4: string[];
  p5: string; p6: string[];
};
type Evidence = {question:'P1'|'P3'|'P4'|'P5'|'P6'; answerId:string; ruleId:string};
type RecommendationItem = {
  productId:string; role:string; priority:number;
  evidence:Evidence[]; explanation:string; optional:boolean;
};
type Recommendation = {
  questionnaireVersion:string; rulesVersion:string;
  baseWash:RecommendationItem;
  alternativeWash?:RecommendationItem; // EXCLUYENTE con baseWash en carrito
  modules:RecommendationItem[];
  hairMistUpsell?:RecommendationItem;
};
```

**Integración:** el endpoint de recomendaciones debe calcular en servidor con versión publicada; no confiar en precios ni productos enviados por el cliente. El carrito valida nuevamente SKU, cantidad, disponibilidad y precio. Mantener la elección del sistema de lavado al editar el carrito.

## 9. Pruebas de aceptación obligatorias

Importar y ejecutar las hojas `Pruebas de aceptación` y `Pruebas P1 alternativa` del motor. Como mínimo:

| Caso | Entradas relevantes | Resultado obligatorio |
|---|---|---|
| T01 | P1 Graso; P4 Ninguno; P5 Brillo | Base Equilibrio; sin alternativa Scalp; Shine Gloss si justificado. |
| T02 | P1 Graso; P4 Caspa + Descamación; P5 Cuidar caspa | Equilibrio **visible** + Scalp **alternativa**; Scrub Glow; solo un kit seleccionado. |
| T03 | P1 Seco; P4 Acumulación; P5 Nutrir | Nutrición **visible** + Scalp alternativa; nutrición protagonista. |
| T04 | P1 Normal; P4 Caspa; P5 Puntas | Botanical **visible**, nunca llamado anticaspa; Scalp alternativa; puntas protagonista. |
| T05 | P1 Caspa/acumulación; P4 Caspa | Scalp base una sola vez; Scrub Glow si justificado. |
| T06 | P1 Graso; P4 solo Caída + Crecimiento; P5 Caída | Equilibrio base; **no** Scalp alternativa; Tónico + Shots. |
| T07 | P1 Seco; P5 Reparar | Nutrición siempre visible; tratamiento de reparación según P3. |
| T08 | P1 Graso; P4 Exceso de grasa; P5 Controlar grasa | Equilibrio base; Scalp alternativa, nunca reemplazo silencioso. |
| T09 | P1 Normal; P4 Acumulación; P5 Brillo | Botanical base; Scalp alternativa; Shine Gloss si justificado. |
| T10 | P1 Graso; P3 todas; P4 todas; P5 Caída; P6 Calor | Equilibrio base; Scalp alternativa; caída protagonista; seleccionar tratamientos adicionales sin saturar ni recomendar Botanical. |

**Pruebas negativas:** P2 natural + decoloración se rechaza; P4 ninguno + caspa se rechaza; duplicados se eliminan; ningún producto sin evidencia; sin P1 no hay recomendación; cambio de P1 actualiza base y razones; seleccionar alternativa desmarca base en carrito; un Hair Mist nunca se presenta como solución de caspa o caída; agotado no se compra; cualquier modificación del admin corre regresión antes de publicar.

## 10. Plan de implementación por fases y criterios de entrega

**Fase 0 — Auditoría del proyecto:** identificar stack, modelos de producto, sistema de carrito, roles, rutas y código actual de Emma. Entregar mapa de archivos y riesgos.

**Fase 1 — Datos y reglas:** importar/normalizar Excel en configuración estructurada versionada; verificar IDs reales y textos. Construir motor puro y tests.

**Fase 2 — Experiencia:** conectar seis preguntas, validaciones, recomendaciones, «¿Por qué para mí?», selector exclusivo y carrito.

**Fase 3 — Centro de Emma:** CRUD de fichas, reglas, textos, borradores/publicación, simulador, roles, auditoría.

**Fase 4 — QA:** correr escenarios originales y nuevos, pruebas de integración carrito/stock, accesibilidad, móviles, seguridad y regresión.

**Fase 5 — Publicación:** despliegue gradual, monitorización de resultados, rollback preparado.

### Definición de terminado

- [ ] Se ven las 6 preguntas correctas, sin opción `Mixto`.
- [ ] La base de lavado de P1 aparece en **100%** de recomendaciones válidas.
- [ ] Scalp Therapy es **alternativa explicada**, salvo cuando es la base P1.
- [ ] El carrito nunca incluye dos sistemas de lavado automáticamente.
- [ ] P5 determina el tratamiento protagonista y P3/P4/P6 alteran resultados de forma verificable.
- [ ] Emma puede recomendar solo 2–3 productos; no rellena rutinas.
- [ ] Botanical jamás recibe explicación detox/anticaspa/control de grasa.
- [ ] Cada producto tiene evidencia rastreable y copy aprobado.
- [ ] Hair Mist se presenta como extra sensorial opcional.
- [ ] El panel permite crear, probar, aprobar y publicar un producto nuevo **sin editar código**.
- [ ] Los tests de los Excel y de §9 pasan, con reporte adjunto.
- [ ] Se entrega documentación de administración, variables de entorno, migraciones y procedimiento de rollback.

## 11. Instrucción final para Cursor

**No hagas una implementación superficial basada en `if` que devuelve siempre la misma lista.** Primero extrae y valida las reglas de ambos Excel, después implementa el motor determinístico con razones auditables, finalmente integra UI, carrito y administración. Conserva el diseño de la web, sus componentes y su infraestructura actual. Ante una regla ambigua o un claim no verificado, **detén esa decisión puntual y solicítala**; no inventes. Entrega archivos modificados, pruebas, resultados y un resumen de las decisiones técnicas tomadas.
