# Consigna — Resumen

Fuente: `Prueba_Tecnica_Full_Stack_React_Native_NestJS.docx` (provisto por el usuario).

## Objetivo

Desarrollar una solución Full Stack para una app móvil de chat. Integrar una API en NestJS + MongoDB con una app en React Native. Evaluar diseño, implementación y documentación de un flujo funcional de punta a punta.

## Modalidad de entrega

- Repositorio público en Git (monorepo o carpetas separadas backend/mobile).
- README principal: requisitos, variables de entorno, instalación, ejecución, datos de prueba, decisiones relevantes.
- Entrega integrada: la app debe consumir la API real (mocks solo para arrancar desarrollo).
- Alcance identificable: si algo no se completa, indicar qué falta y cómo se resolvería.

## Stack requerido

| Componente | Definición |
|---|---|
| Backend | NestJS + TypeScript (Node.js+TS aceptado con justificación) |
| Base de datos | MongoDB |
| App móvil | React Native + TypeScript |
| Estado | Redux, Zustand, Context u otra alternativa equivalente |
| Dependencias | npm o yarn, librerías externas documentadas |
| Contenedores | Dockerfile obligatorio para backend, Compose adicional |

## Alcance funcional obligatorio

### Autenticación
- Login con email + contraseña.
- Validación de datos ingresados (criterio del candidato).
- Mecanismo de autenticación y manejo de sesión.
- Redirección al listado de chats tras login exitoso.
- Mensajes claros ante credenciales inválidas o errores de conexión.

### Usuarios y perfiles
- CRUD de usuarios (estructura y relaciones a criterio del candidato).
- Listado con filtro de texto, paginado y ordenamiento.
- Perfil: nombre, apellido, fecha de nacimiento, teléfono, foto/avatar, estado de conexión, última conexión.
- Pantalla de perfil editable + cambio de estado de conexión.
- Validación de campos requeridos y email único.

### Listado de chats
- Chats disponibles para el usuario autenticado.
- Cada ítem: nombre del contacto, último mensaje, fecha/hora.
- Selección de chat → abre conversación.
- Estados: carga, lista vacía, error.

### Conversación
- Historial de mensajes de un chat.
- Cada mensaje: remitente, contenido, fecha/hora.
- Envío y persistencia de mensajes de texto.
- Actualización inmediata de la UI tras enviar.
- Adjuntar imagen o archivo (persistir archivo o referencia — documentar decisión).
- Navegación de vuelta al listado.

## Requisitos del backend

1. Diseño de arquitectura, estructura del proyecto y responsabilidades.
2. API REST: auth, usuarios, perfiles, chats, mensajes (rutas/nomenclatura a criterio).
3. Validaciones consistentes de entradas y reglas de negocio.
4. Seguridad: autenticación, protección de recursos, datos sensibles.
5. Persistencia en MongoDB.
6. Manejo de errores: respuestas claras y consistentes.
7. Documentación de API (Swagger o equivalente) con ejemplos.
8. Pruebas unitarias para casos relevantes.

## Requisitos de la app móvil

1. Navegación: login, listado de chats, conversación, perfil.
2. Integración: consumir API, configuración centralizada, sin datos fijos hardcodeados.
3. Manejo de estado: sesión, usuario, chats, mensajes.
4. Formularios: validaciones, confirmaciones, errores cerca de la acción.
5. UX: carga, error, contenido vacío, reintento, teclado.
6. Diseño claro y consistente (detalles visuales a criterio).
7. Al menos una prueba de componente/hook/store/flujo crítico.

## Diseño de datos

El candidato define modelos, campos y relaciones necesarios. Se evalúa coherencia, nomenclatura y justificación de decisiones.

## Entrega técnica

- Código fuente: repo público, ordenado, sin secretos ni credenciales.
- `.env.example` + datos suficientes para probar el flujo.
- Dockerfile funcional para backend.
- README: instalación, ejecución, arquitectura, rutas principales, credenciales de prueba, decisiones.
- Swagger accesible al ejecutar el backend.
- Scripts de test y resultados reproducibles.

## Criterios de evaluación

| Criterio | Peso | Qué se observará |
|---|---|---|
| Funcionamiento e integración | 30% | Flujo completo, persistencia, comunicación app↔API |
| Backend | 25% | Diseño REST, modelos, auth, validaciones, errores, organización |
| App móvil | 25% | Interfaz, navegación, manejo de estado, UX, estados visuales |
| Calidad técnica | 10% | Legibilidad, arquitectura, tipado, mantenibilidad |
| Pruebas y documentación | 10% | Cobertura relevante, README, Swagger, facilidad de ejecución |
