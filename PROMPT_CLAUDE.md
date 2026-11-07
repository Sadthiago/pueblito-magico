# 🌻 Especificación del Proyecto: "Nuestro Jardín Mágico de Flores Eternas"

> **Documento maestro para Claude (Claude Code / Chat)**  
> *Este documento compila la visión del producto, la arquitectura técnica, las referencias creativas y el estado actual del código para guiar el desarrollo, optimización o expansión del proyecto.*

---

## 1. 💌 Visión y Concepto Emocional

### La Premisa
> *"Las flores reales con los días se marchitan... pero en este jardín que construí para ti, cada flor que te regale vivirá para siempre."*

El proyecto es una experiencia web interactiva, romántica e íntima, creada por **Santiago** para su novia. Nació con la tradición de las **Flores Amarillas del 21 de septiembre**, pero su diseño está pensado como un ecosistema vivo y acumulativo a lo largo de su relación.

### El Ritual Físico-Digital
1. **El Regalo Físico:** Santiago le entrega a su novia un ramo de flores reales acompañado de una tarjetita con un código QR generado desde el panel secreto del jardín.
2. **El Escaneo Mágico:** Al escanear el QR con la cámara de su celular, se abre la web y se reproduce una ceremonia de brote: una semilla nace de la tierra (🌱 ➔ 🌿 ➔ 🌻), estalla confeti dorado y pétalos flotantes.
3. **El Scrapbook Eterno:** La flor queda plantada para siempre en su pradera personal (guardada en el navegador vía `localStorage`). Al tocarla, puede ver la foto del ramo real, una foto de los dos juntos ese día, una carta manuscrita y el significado de la flor.
4. **Cuidado y Riego:** Ella puede volver en cualquier momento a regar sus flores con una regadera interactiva para mantenerlas radiantes al 100% (con sonido de agua, flores felices y corazones `💖`).

---

## 2. 🎨 Referencias de Diseño e Inspiraciones Creativas

**Dirección actual: el estilo del juego de mascotas que Santiago y su novia juegan juntos, pensado primero para el celular.** Todo es redondito, de colores pastel planos y con un contorno grueso color chocolate (`#4a3226`), como stickers. Arriba, una casita de hadas con techo de tejas redondas, buganvilia y glicina, entre colinas y arbolitos. Abajo, macetitas pastel que bajan sin tope por los dos lados de un caminito con faroles, hongos, arbustos y caracoles. Cinco mascoticas pasean por la pradera: Oreo, Panpan y Sky (sus mascotas del juego) y Kuromi y Melody (su gatica y su perrita de verdad). Letras redonditas: `Fredoka` para títulos e interfaz y `Nunito` para las cartas.

Referencias de las que partió el proyecto, hoy reducidas a lo esencial:

1. **Bertdida (CodePen - CSS Cottage/Shop):**
   - Punto de partida de la casita: chimenea humeante, techo de terracota, plantas y letrero "Pueblito Mágico". Hoy es una casa de piedra dibujada en SVG, inspirada en una foto que eligió Santiago: techo de tejas con las puntas levantadas, postigos verdes, balcón cubierto de buganvilias, glicina, puerta redonda con corazón, macetas de barro y hongos. Sus ventanas se encienden de noche.
2. **Ksenia-K (CodePen - Atmósferas Poéticas):**
   - Ambiente nocturno: estrellas, luna creciente, pocas luciérnagas (`ambientCanvas`) y guirnalda de luces. Los pétalos solo saltan al brotar una flor.
3. **Terraria / Stardew Valley (Ciclo Celeste & Tiempo Dinámico):**
   - Selector y ciclo continuo de horas: **Día Soleado (☀️)**, **Atardecer Dorado (🌅)** y **Noche Estrellada (🌙)**.
   - Sol y Luna montados en una órbita radial CSS (`--orbit-angle`) que rotan sobre el horizonte con iluminación contextual.
4. **Matt Cannon & Nate Wiley (CodePen - Flores Procedimentales):**
   - Ilustraciones SVG generadas por código: pétalos de colores planos con contorno grueso color chocolate.
5. **Estética Scrapbook / Polaroid:**
   - Fotos sobrias con pie de texto y carta sobre papel liso (`#faf7ef`), sin cinta, rotación ni renglones.

---

## 3. 🛠️ Arquitectura Técnica y Stack

- **Filosofía:** Cero complejidad de backend, carga instantánea, 100% autónomo y desplegable en cualquier hosting estático gratuito (Vercel, GitHub Pages, Netlify).
- **Celular primero:** pantalla completa, barra inferior fija, hojas que suben desde abajo y se cierran deslizando, e instalable en la pantalla de inicio (`manifest.webmanifest`). No hay service worker: sin conexión no abre.
- **Jardín sin tope:** el campo se alarga hacia abajo y se desplaza con el dedo. Siempre queda una hilera libre al final.
- **Core:** HTML5, CSS3 moderno (estilos propios en `style.css`, sin Tailwind), Vanilla JavaScript (ES6+).
- **Librerías externas (vía CDN):**
  - **Google Fonts:**
    - `Fredoka` (títulos, interfaz, letrero) y `Nunito` (cartas y textos largos).
  - **Iconos:** dibujados como `<symbol>` dentro de `index.html`; no hay librería de iconos.
  - **Canvas Confetti (`canvas-confetti`):** Explosión festiva al brotar flores o regar el jardín.
  - **QRCode.js (`qrcodejs`):** Generador instantáneo de códigos QR en el cliente.
  - **Web Audio / HTMLAudioElement:** Web Audio API para las melodías generadas y los efectos (campanitas, riego, lluvia); `HTMLAudioElement` para canciones propias.

---

## 4. 📂 Estructura de Archivos del Proyecto

Ruta local actual del proyecto:
`C:\Users\santi\jardin-flores-magicas\`

```
jardin-flores-magicas/
├── index.html          # Markup completo: cielo, casita, pradera, modales y formularios
├── style.css           # Estilos, ciclo de color por hora, hojas de contenido y animaciones
├── script.js           # Lógica interactiva: ciclo celeste, canvas de luciérnagas, SVG generator y audio
├── flowers-data.js     # Capa de datos: localStorage, fotos en IndexedDB, QR y copias de seguridad
├── manifest.webmanifest # Datos para instalarla como app en el celular
├── flores/             # Flores con fotos o cartas largas: <id>.json, se publican con el sitio
├── README.md           # Guía rápida de uso y despliegue para Santiago
└── assets/             # Íconos de la app (180, 192 y 512 px)
```

---

## 5. 🔍 Detalle de Componentes y Mecánicas de Código

### A. Ciclo Día / Tarde / Noche (Terraria Style)
- En `style.css`, el degradado de `#skyBackground`, las colinas y el campo cambian de color según la clase `time-day`, `time-sunset` o `time-night`.
- Un solo botón (`#btnTime`) pasa por Día, Tarde, Noche y Auto.
- `.celestial-orbit` rota los elementos `.celestial-sun` y `.celestial-moon` usando la propiedad CSS `--orbit-angle` (0° para mediodía, 70° para atardecer, 180° para noche estrellada).
- En `script.js`, existe un modo manual y un modo automático de paso del tiempo (`isAutoCycling`) que avanza cada 15 segundos. Al abrir, la hora inicial sale del reloj real.

### B. Generador de Flores SVG (`createFlowerSVG`)
Ubicado en `script.js`. Colores planos con contorno grueso (`INK`, `OUTLINE`); el tallo lleva un trazo oscuro debajo para verse contorneado. Cada flor usa una semilla, así que varía un poco y cada una se ve siempre igual:
1. `astromelia`: Un solo tallo que se abre en un ramito de cuatro flores con pétalos rayados y dos capullos. Es la flor del ramo real que Santiago regaló y el tipo por defecto.
1. `sunflower`: Girasol con dos coronas de pétalos en punta, nervaduras y disco con semillas en espiral.
2. `rose`: Rosa de cuatro capas de pétalos redondos, cada uno encima del anterior, con espiral central.
3. `tulip`: Tulipán de tres pétalos delanteros y corola trasera, con dos hojas largas.
4. `daisy`: Margarita de dos coronas de pétalos redondos y centro punteado.
5. `wildflower`: Cosmos de ocho pétalos con la punta hendida, nervaduras y un capullo a un lado.
- Un anillo entero de pétalos sigue siendo un solo trazado (`petalRing`). La astromelia usa un id único (`flowerUid`) para repetir su flor con `<use>`, porque también se exporta sola como imagen.
- `flowerPot` dibuja una macetita redonda en tonos pastel (durazno, rosa, crema, menta, lila o cielo), con hiedra y florecitas del color de la flor; la semilla elige el color, el adorno (corazón, florecita o puntitos) y el lado de la hiedra.
- `flowerPalette` saca cuatro tonos de cualquier color y sube la saturación de lo que tiene color; lo pálido sigue pálido. Colores sugeridos en el panel: `#e3ae2b`, `#d98a2b`, `#edd27a`, `#c9602e`.

### B2. Siembra del jardín (`flowerSlot`)
- Las macetas bajan a los dos lados de un caminito que serpentea: 2 carriles en celular y hasta 8 en pantallas grandes (`columnsForWidth`).
- Una flor nueva no mueve a las demás: siempre queda más abajo que la anterior y alarga el campo.
- `drawGardenTrail` dibuja el caminito una sola vez como fondo (`--trail`). El fondo mide tres tramos y en cada uno los faroles, hongos, arbustos, piedras, caracoles y florecitas caen en otro sitio, así no se nota que se repite.
- `drawGrass` pinta el pasto en tres capas de alto distinto (claros de sol, matitas con tréboles y florecitas), así sus repeticiones casi nunca coinciden. Las florecitas esquivan el caminito.

### B3. Mascoticas (`Pets`) y el sol que se agarra
- `Pets` dibuja a Oreo (perrito con alitas de murciélago y chupo), Panpan (panda con moño y camiseta de rayas), Sky (pingüino disfrazado de calabaza con gafas verdes), Kuromi (gatica blanca y negra con collar morado) y Melody (perrita peludita blanca con orejas color caramelo).
- Caminan por la parte visible de la pradera, a veces piensan en algo (globito con hueso, pescado, bambú, flor, estrella o corazón) y al tocarlas saltan, dicen su nombre y sueltan corazones. De noche duermen con los ojitos cerrados.
- El sol y la luna son botones: arrastrarlos de lado cambia la hora y al soltarlos se acomodan; un toque pasa a la hora siguiente.
- Solo se mecen las flores cerca de la pantalla (`IntersectionObserver` y clase `is-near`).

### C. Almacenamiento y Protocolo de Código QR (`flowers-data.js`)
Para no depender de bases de datos externas:
- **Codificación:** Al crear una flor en el panel, se genera un objeto JSON compacto con:
  ```json
  {
    "id": "flor_k8z...",
    "t": "sunflower",
    "c": "#facc15",
    "tt": "Girasoles para iluminar tu semana",
    "d": "2026-09-21",
    "l": "Mi niña hermosa, te regalo este rinconcito...",
    "m": "Simboliza la luz que traes a mis días.",
    "rp": "data:image/... o url",
    "cp": "data:image/... o url"
  }
  ```
- Este JSON se codifica en Base64 seguro para URI y se adjunta como parámetro de consulta:  
  `https://tudominio.com/?flor=<BASE64_DATA>`
- **Límite:** las fotos subidas y las cartas largas no caben en un QR. Si la flor lleva archivos o la URL supera `QR_DIRECT_LIMIT` (900 caracteres), el panel genera un QR corto `?f=<id>` y un archivo `flores/<id>.json` que Santiago publica con el sitio.
- **Fotos:** se reducen a 1200 px y se guardan en IndexedDB (`jardin_magico_media`); en `localStorage` queda solo la referencia `idb:...`.
- **Validación:** todo lo que llega por QR o por archivo pasa por `normalizeFlower` antes de tocar la página.
- **Decodificación:** Al cargarse la página, `FlowerStore.decodeFlowerFromURL()` detecta el parámetro `flor`, decodifica el payload, activa el modal de celebración (`sproutCelebrationModal`), espera un toque en la tierra para poder sonar (arranca sola, sin sonido, a los 6 segundos), ejecuta el brote con confeti y guarda permanentemente la flor en `localStorage` (`jardin_magico_flores_v1`).

### D. Interacciones y Scrapbook
1. **Regadera Mágica:**
   - Botón `#btnWateringCan`: Al activarse, el cursor cambia a una regadera o modo riego.
   - Al tocar cualquier flor: Cae lluvia de partículas, sonido de gotas, la flor rebota con clase CSS `.flower-happy`, salen corazones y su `waterLevel` sube al 100%.
2. **Modal Polaroid & Carta (`#flowerModal`):**
   - Tres pestañas:
     - **💌 La Cartica:** Carta en `Newsreader` sobre papel liso con firma personalizada.
     - **📸 Fotos de Nosotros:** 2 fotos (ramo real + pareja junta). Si no se subió foto, usa placeholders SVG artísticos pre-renderizados.
     - **✨ Significado:** Texto explicando la simbología de esa flor.
3. **Banquita y Buzón Secreto:**
   - **Nuestra Banquita (`#btnBench`):** Espacio para reflexionar con botón de "Regar todo el jardín de una vez".
   - **Buzón de Carticas (`#btnLoveLetters`):** Mensajitos rápidos tipo *"Abre cuando tengas un día difícil"*, *"Por qué te regalo flores amarillas"* o *"Abre si me extrañas"*.

---

## 6. 🚀 Tareas y Directivas para Claude

Cuando estés trabajando en este proyecto, sigue estas reglas:

1. **Preservar la Sensibilidad Emocional:** Cada texto, microinteracción, color y animación debe transmitir ternura, delicadeza y dedicación artesanal. Evita interfaces genéricas, grises o corporativas.
2. **Respetar la Simplicidad de Despliegue:** Mantener la arquitectura estática (`HTML/CSS/JS` puros o componentes sin dependencias de compilación complejas) a menos que se solicite expresamente migrar a Next.js/React.
3. **Mejoras ya implementadas:** lluvia con sonido, mariposas interactivas, exportación de recuerdos a imagen y PDF, copia de seguridad en JSON, melodía propia por flor e instalación como app.
4. **Diseñar para el celular primero:** se verá ahí. Todo debe funcionar con el dedo, sin depender de pasar el ratón, en pantallas desde 320 px.
5. **Dejar sitio:** el jardín tiene que aguantar cientos de flores. No subir el peso de cada flor sin medirlo.
6. **Pendiente, si se desea:** sincronizar el jardín entre dispositivos con Neon o Supabase. Requiere un backend, así que solo se hace si Santiago lo pide expresamente.

---

*Proyecto creado con amor por Santiago para su novia.* ❤️🌻
