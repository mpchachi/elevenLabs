# MockMaster

Simulador de entrevistas técnicas con voz en tiempo real. Hablas con un entrevistador que te escucha, responde y te presiona como en una entrevista real. Nada de chatbots de texto: aquí usas el micro y te contestan de vuelta.

El backend crea agentes conversacionales con la API de ElevenLabs y les inyecta un prompt que simula el estilo de entrevista de empresas reales (Amazon, Google, startups YC). El frontend muestra la transcripción en vivo, métricas de rendimiento en tiempo real y un post-mortem completo al terminar.

---

## Cómo funciona

1. Eliges un perfil de entrevistador en la home.
2. El servidor pide a ElevenLabs que cree un agente con la personalidad, voz y prompt de ese perfil.
3. Se abre una conexión WebSocket con signed URL y empieza la entrevista por voz.
4. Mientras hablas, el panel lateral analiza tu respuesta: claridad, estructura STAR, filler words, datos cuantitativos que citas, ratio de tiempo hablando vs escuchando.
5. Si tienes el modo "Pressure" activado, el sistema inyecta señales de interrupción al agente cuando detecta respuestas demasiado largas, sin datos o demasiado cortas.
6. Al terminar, la pantalla de post-mortem te da un score global, un timeline visual de cada intercambio, los momentos clave (mejor/peor respuesta) y tips de mejora generados con GPT-4o-mini.

## Perfiles disponibles

| Perfil | Estilo | En qué te machaca |
|---|---|---|
| **The Amazonian** | Leadership Principles, formato STAR, follow-ups brutales | Métricas, ownership, "¿qué hiciste TÚ exactamente?" |
| **The Googler** | Algoritmia + system design, estilo socrático | Big-O, edge cases, escalabilidad a mil millones de usuarios |
| **The Startup Bro** | Caótico, product thinking, first principles | "Dame un número", hipotéticos absurdos, "eso suena a post de LinkedIn" |

## Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts
- **Backend**: Express, ElevenLabs Conversational AI API
- **Coaching**: OpenAI GPT-4o-mini (para los tips post-mortem)
- **Voces**: ElevenLabs Turbo v2 con voces pre-hechas del catálogo
- **LLM del agente**: Claude 3.5 Sonnet (configurable)

## Setup

```bash
git clone https://github.com/mpchachi/elevenLabs.git
cd elevenLabs
npm install
```

Copia el archivo de configuración y añade tus claves:

```bash
cp .env.example .env
```

Necesitas como mínimo la `ELEVENLABS_API_KEY`. Si quieres los tips post-mortem, también `OPENAI_API_KEY`.

Los agent IDs se crean solos la primera vez que inicias una sesión con cada perfil. Si prefieres crearlos manualmente en el dashboard de ElevenLabs, pégalos en el `.env` y se salta la creación automática.

## Arrancar

```bash
npm run dev
```

Esto levanta el servidor Express en `localhost:3001` y el cliente Vite en `localhost:5173` en paralelo con `concurrently`. Abre el navegador en `http://localhost:5173`, dale acceso al micro y a sufrir.

## Estructura del proyecto

```
server/
  index.js          # API Express: health, profiles, sessions, tips
  agents.js         # Definiciones de perfiles (prompts, voces, LLM config)

src/
  pages/
    Home.jsx        # Selector de perfiles
    Interview.jsx   # Pantalla de entrevista en vivo
    PostMortem.jsx  # Análisis post-sesión

  components/
    ProfileCard.jsx      # Cards de la home
    StatusIndicator.jsx  # Estado de conexión (connecting/listening/speaking)
    TranscriptPanel.jsx  # Transcripción en vivo
    FeedbackPanel.jsx    # Panel lateral con métricas en tiempo real
    postmortem/          # Componentes del post-mortem (gauge, timeline, tips...)

  hooks/
    useConversation.js   # Lógica de conexión WebSocket con ElevenLabs
    useFeedback.js       # Análisis de métricas por turno
    useInterruptions.js  # Sistema de interrupciones automáticas

  config/
    profiles.js          # Metadata visual de perfiles (colores, emojis, traits)
```

## Requisitos

- Node >= 18
- API key de ElevenLabs (plan que soporte Conversational AI)
- Navegador con soporte de WebSocket y acceso al micrófono
- Opcional: API key de OpenAI para los tips de mejora

## Notas

- Las sesiones se guardan en `localStorage` (máximo 30). No hay base de datos.
- El post-mortem muestra un histórico si tienes más de una sesión guardada.
- El modo Pressure inyecta señales `[INTERRUPT:...]` al agente que nunca aparecen en la transcripción visible. El agente está instruido para responder en personaje sin mencionar la señal.
- Si no configuras `OPENAI_API_KEY`, todo funciona igual pero la sección de tips del post-mortem mostrará un error. No rompe nada.
