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

1. **Abre el panel secreto.** Entra a `tu-sitio/?panel`, o toca 5 veces seguidas el letrero "Pueblito Mágico". Aparece el botón **Panel** solo en ese dispositivo. Hazlo en el tuyo, no en el de ella.
2. **Llena la flor:** tipo, color, título, fecha, carta, significado, firma, fotos y melodía. Escribe la dirección de tu sitio publicado; se recuerda para la próxima.
3. **Genera el QR.** El panel elige solo la forma de entrega:
   - **Sin fotos subidas y texto corto:** toda la flor viaja dentro del QR. No hay que hacer nada más.
   - **Con fotos subidas, canción o carta larga:** no caben en un QR. Pulsa **Descargar la flor**, guarda el `.json` en la carpeta `flores/` y **publica de nuevo**. Después usa **Comprobar publicación**.
4. **Descarga la tarjetita**, imprímela y entrégala con el ramo real.

Al escanear, ella toca la tierra, la semilla brota y la flor queda plantada para siempre.

---

## Qué hay en el jardín

- **Ciclo celeste:** día, atardecer y noche con sol y luna en órbita. Arranca según la hora real. El sol y la luna se agarran: arrástralos para cambiar la hora o tócalos para pasar a la siguiente. El botón de arriba a la derecha también va pasando de hora, y en **Auto** el tiempo avanza solo cada 15 segundos.
- **El estilo:** como el juego de mascotas de los dos: todo redondito, en colores pastel y con contorno grueso color chocolate.
- **La casita:** de hadas, con techo de tejas redondas, buganvilias y glicinas, entre colinas y arbolitos.
- **Las mascoticas:** Oreo, Panpan y Sky (las del juego) y Kuromi y Melody (la gatica y la perrita de verdad) pasean por la pradera. Si las tocas, saltan y dicen su nombre; de noche duermen.
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

- **El jardín vive en el navegador de cada dispositivo.** Si se borran los datos del navegador se pierde, y Safari en iPhone puede borrarlos tras varios días sin abrir el sitio. Para protegerlo: **Recuerdos > Guardar copia** de vez en cuando. Volver a escanear un QR también replanta esa flor. Añadir el sitio a la pantalla de inicio del iPhone reduce el riesgo.
- **El panel secreto no es seguridad.** Solo está escondido. Y los archivos de `flores/` son públicos para quien adivine su nombre: no pongas nada que no quieras que exista en internet.
