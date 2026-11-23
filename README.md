# Nuestro Jardín Mágico de Flores Eternas

> *"Las flores reales con los días se marchitan... pero en este jardín que construí para ti, cada flor que te regale vivirá para siempre."*

Una app para el celular hecha como sitio estático: HTML, CSS y JavaScript sin compilación ni backend. Se publica gratis en Vercel, Netlify o GitHub Pages.

---

## Probarlo en tu computadora

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. Abrir `index.html` con doble clic también funciona, salvo las flores con fotos del paso 3.

---

## Publicarlo

**Vercel:** entra a [vercel.com](https://vercel.com) y arrastra esta carpeta. Te dará una dirección como `https://nuestro-jardin.vercel.app`.

**GitHub Pages:** sube los archivos a un repositorio y activa **Settings > Pages** desde la rama `main`.

El QR tiene que apuntar al sitio publicado: una dirección `localhost` no abre en el celular de ella.

## Dejarlo como app en su celular

Así abre a pantalla completa, con su ícono de girasol.

- **iPhone:** abre el sitio en Safari, pulsa Compartir y luego **Añadir a pantalla de inicio**.
- **Android:** abre el sitio en Chrome, abre el menú y pulsa **Instalar app** o **Añadir a pantalla de inicio**.

Necesita internet para abrir.

---

## Regalar una flor

1. **Entra con tu clave.** Con la clave de Santiago aparece el botón **Panel**; con la de ella no.
2. **Llena la flor:** tipo, color, título, fecha, carta, significado, firma, fotos y melodía. Escribe la dirección de tu sitio publicado; se recuerda para la próxima.
3. **Genera el QR.** La flor se guarda en la nube, escondida, con sus fotos y su canción. El QR solo lleva su nombre. No hay que publicar nada.
4. **Descarga la tarjetita**, imprímela y entrégala con el ramo real.

Al escanear le llega una cartica: el sobre se abre como un libro, con la foto a la izquierda y la semillita a la derecha. Ella toca la semilla, brota, crece la flor y queda plantada para siempre, en todos sus dispositivos.

---

## La nube (Firebase)

El jardín se guarda en Firebase (proyecto `pueblito-magico-245f6`, plan gratis Spark, que no se pausa). Es el mismo en el celular de ella, en el tuyo y en cualquier computador.

- **Dos claves:** cada una es una cuenta de Firebase con un correo escondido que nadie escribe:
  - `ella@pueblito-magico-245f6.firebaseapp.com`: ve el jardín, riega y hace brotar sus flores.
  - `santiago@pueblito-magico-245f6.firebaseapp.com`: además crea y quita flores.
  Se crean en **Firebase > Authentication > Usuarios > Agregar usuario**. Para cambiar una clave, borra el usuario y créalo otra vez con el mismo correo.
- **La clave se pide una sola vez** por teléfono. **Recuerdos > Salir del jardín** la olvida.
- **Reglas:** `firestore.rules`. Sin una de las dos claves nadie puede leer ni escribir nada. Si las cambias, pégalas en **Firestore Database > Reglas** y publica.
- **Fotos y canciones** se guardan partidas en pedazos dentro de Firestore, así no hace falta activar Storage (que pide tarjeta). Se bajan una vez y quedan guardadas en el teléfono.
- **Sin señal** se ve lo último que llegó, y lo que se riegue se sube al volver la conexión.
- Los QR antiguos siguen funcionando.

---

## Qué hay en el jardín

- **Ciclo celeste:** día, atardecer y noche con sol y luna en órbita. Arranca en **Auto** según la hora real y el cielo gira sin parar: un día entero dura unos 5 minutos y medio. El sol y la luna se agarran: arrástralos para cambiar la hora o tócalos para pasar a la siguiente; a los 2 minutos el tiempo vuelve a correr solo.
- **Animaciones:** el jardín se mueve aunque Windows o el celular tengan las animaciones apagadas. **Recuerdos > Animaciones del jardín** lo deja quieto.
- **Ramo con globito:** un tipo de flor que es un ramo de astromelias envuelto en papel con rayas doradas, moño rojo y globito dorado de corazón.
- **El estilo:** como el juego de mascotas de los dos: todo redondito, en colores pastel y con contorno grueso color chocolate.
- **La casita:** de hadas, con techo de tejas redondas, buganvilias y glicinas, entre colinas y arbolitos.
- **Las mascoticas:** Oreo, Panpan y Sky (las del juego) y Kuromi y Melody (la gatica y la perrita de verdad) pasean por la pradera. Si las tocas, saltan y dicen su nombre; de noche duermen.
  - **Se arrastran con el dedo.** Donde las sueltes se sientan a mirar el jardín un ratico. Si las sueltas en la puerta, entran a la casita; si las sueltas en el cielo, saltan al pasto.
  - **Solas** van a sentarse frente a una flor, se visitan entre ellas y entran a la casita.
  - **La casita:** desde adentro se asoman por las ventanas y saltan al pasto, o salen por la puerta. Tocar la puerta hace salir a alguien (o entrar al que esté más cerca). Tocar una ventana hace que alguien se asome por ahí. Tocar a la que está asomada la hace saltar.
  - **Bailan** mientras suena música.
- **Canciones del jardín:** en el panel subes canciones (archivo de hasta 8 MB o enlace a un `.mp3`). Suenan solas cada cierto tiempo mientras el jardín está abierto. En **Recuerdos** cada dispositivo elige cada cuánto (5, 10, 20, 30 minutos, cada hora o nunca) y hay un botón para escuchar una ya. Necesitan que se haya tocado la pantalla una vez: los celulares no dejan sonar nada antes.
- **El campo:** sin tope. Cada flor vive en su macetita pastel, y las macetas bajan por los dos lados de un caminito con faroles, hongos, arbustos y caracoles que no se repiten igual; se recorre deslizando el dedo.
- **Atmósfera:** nubes, polvo de hadas, guirnalda de luces, estrellas y luciérnagas; pétalos solo cuando brota una flor.
- **Regadera:** al tocar una flor llega la regadera, caen gotas con sonido, la flor rebota y salen corazones. Sin riego pierde brillo muy despacio, pero nunca baja del 55 %.
- **Lluvia:** con sonido de gotas en el tejado. Si dura un ratico, riega todo el jardín.
- **El hada y las mariposas:** se posan en las flores y siempre visitan la recién regada. Si las tocas, salen volando.
- **Recuerdo de cada flor:** cartica, fotos y significado.
- **Recuerdos:** cada flor se descarga como imagen o PDF. Una foto de otro sitio solo entra si ese sitio lo permite; si no, sale el dibujo de la flor.
- **Banquita y buzón:** se tocan directamente en la escena.
- **Música:** tres melodías generadas en el navegador, o una canción propia por flor (archivo de hasta 8 MB o enlace directo a un `.mp3`).

---

## Personalizar

- **Mensajes del buzón:** `QUICK_LETTERS`, al principio de `flowers-data.js`.
- **Flor de bienvenida:** `INITIAL_DEMO_FLOWER`, en el mismo archivo.
- **Melodías:** `TRACKS`, en `script.js`.

---

## Conviene saber

- **El jardín vive en la nube.** Si el navegador borra sus datos, basta con volver a escribir la clave. **Recuerdos > Guardar copia** queda como respaldo extra.
- **Los archivos viejos de `flores/` son públicos** para quien adivine su nombre. Las flores nuevas ya no se guardan ahí.
