# Progreso del proyecto

Última actualización: 2026-09-25

## Estado general: 🟢 Backend completo — sigue mobile

## Setup
- [x] Monorepo creado (`backend/`, `mobile/`, `docs/`)
- [x] Git inicializado
- [x] Modelado de datos definido (`docs/DATA_MODEL.md`)
- [x] Backend scaffoldeado (NestJS 12, ESM/NodeNext, Vitest, oxlint)
- [x] Conexión a MongoDB (Mongoose)
- [ ] Mobile scaffoldeado (React Native)
- [x] Docker (Dockerfile backend + docker-compose con Mongo)

## Backend
- [x] Estructura de módulos (auth, users, chats, messages, common, config)
- [x] Auth (login, JWT, passport-jwt)
- [x] CRUD usuarios/perfiles (alta pública, resto protegido, self-only edit/delete)
- [x] Listado de usuarios (filtro de texto, paginado, orden) y de chats (paginado por participante, más recientes primero)
- [x] Conversación (mensajes de texto y adjuntos vía multipart, servidos como estáticos)
- [x] Validaciones (DTOs con class-validator, ValidationPipe global whitelist+forbidNonWhitelisted)
- [x] Manejo de errores global (`HttpExceptionFilter`, shape consistente)
- [x] Swagger en `/docs` (con Bearer auth)
- [x] Tests unitarios (15, vitest, mockeando Mongoose) + e2e (flujo completo con `mongodb-memory-server`, sin depender de Docker/Mongo externo)
- [x] Seed de datos de prueba (`npm run seed`) con credenciales documentadas

## Mobile
- [ ] Navegación (login, chats, conversación, perfil)
- [ ] Integración API centralizada
- [ ] Manejo de estado (sesión, usuario, chats, mensajes)
- [ ] Formularios con validación
- [ ] Estados de UX (loading, error, empty, retry, keyboard)
- [ ] Diseño UI
- [ ] Al menos 1 test

## Documentación y entrega
- [x] README del backend (instalación, ejecución, env vars, seed/credenciales, arquitectura, rutas, tests)
- [x] README raíz actualizado (instalación, credenciales, estado)
- [x] `.env.example` (backend)
- [x] Dockerfile funcional (backend) + docker-compose (backend + Mongo)
- [x] Scripts de test reproducibles (`npm test`, `npm run test:e2e`)
- [ ] README de mobile

## Notas
- Usuario conoce SQL/PostgreSQL, no tiene experiencia previa con MongoDB — las explicaciones de modelado usan analogías con el mundo relacional.
- Docker no está disponible en este entorno de desarrollo — el `Dockerfile`/`docker-compose.yml` no se probaron corriendo un build real, pero el backend sí se validó de punta a punta (Nest build real + Mongo real en memoria + requests HTTP reales via curl y vía el test e2e). Queda como pendiente de verificación manual del build de Docker en una máquina con Docker instalado.
