# Resumen DevSecOps - Sistema de Gestión Atlas

## 1. SAST (Semgrep)

| Ruleset | Total | ERROR | WARNING | INFO |
|---|---|---|---|---|
| semgrep-owasp | 1 | 1 | 0 | 0 |
| semgrep-atlas | 61 | 12 | 49 | 0 |

## 2. Secretos (Gitleaks)

Secretos detectados en el historial: **1**

## 3. Dependencias (npm audit / Trivy)

| Componente | Crítica | Alta | Moderada | Baja |
|---|---|---|---|---|
| npm backend | 1 | 4 | 2 | 0 |
| npm frontend | 0 | 4 | 2 | 0 |
| Trivy (vuln.) | 1 | 34 | 36 | 4 |
| Trivy (config. Docker) | 0 | 2 | 0 | 2 |

Secretos detectados por Trivy: 0

## 4. Pruebas API automatizadas (Newman)

Peticiones: 51 | Aserciones: 69 | Aprobadas: 32 | Fallidas: 37

| Caso | HTTP | ms | Resultado |
|---|---|---|---|
| [CP-01] Inicio de sesión exitoso entrega JWT válido | 200 | 4009 | APROBADO |
| [CP-02] Credenciales inválidas son rechazadas | 401 | 4007 | APROBADO |
| [CP-10] Crear cliente con datos válidos | 201 | 7 | PARCIAL |
| [CP-10b] Rechazar cliente con correo, RUT y teléfono inválidos | 201 | 6 | FALLIDO |
| [CP-11] Listar clientes de la empresa | 200 | 4009 | PARCIAL |
| [CP-11b] Buscar cliente por nombre | 200 | 7 | APROBADO |
| [CP-14] Crear contrato con documento PDF asociado a un cliente | 201 | 16 | APROBADO |
| [CP-14b] Rechazar contrato con fecha de término anterior a la de inicio | 201 | 5 | FALLIDO |
| [CP-16] Descargar documento del contrato (usuario autorizado) | 200 | 6 | APROBADO |
| [CP-17] Listar contratos con estado calculado | 200 | 4007 | PARCIAL |
| [CP-12] Crear cliente desechable para prueba de eliminación | 201 | 5 | APROBADO |
| [CP-12] Eliminar cliente (debe ser eliminación lógica) | 200 | 5 | PARCIAL |
| [SEC-AUT-01] Inyección SQL en login es rechazada | 401 | 4008 | APROBADO |
| [SEC-AUT-02] JWT con algoritmo 'none' es rechazado | 401 | 4007 | APROBADO |
| [SEC-AUT-03] JWT forjado con secreto por defecto es rechazado | 200 | 4009 | FALLIDO |
| [CP-05] Registro con contraseña débil es rechazado | 201 | 4 | FALLIDO |
| [CP-03] Existe endpoint de cierre de sesión con revocación del token | 404 | 3 | FALLIDO |
| [CP-20a] GET /contratos/:id sin token | 200 | 3 | FALLIDO |
| [CP-20b] GET /contratos/:id/file sin token (descarga de documento) | 200 | 3 | FALLIDO |
| [CP-20c] GET /usuarios/:id sin token | 200 | 2 | FALLIDO |
| [CP-20d] GET /empresas sin token | 200 | 3 | FALLIDO |
| [CP-20e] GET /roles sin token | 200 | 2 | FALLIDO |
| [CP-20f] GET /auditoria sin token | 200 | 2 | FALLIDO |
| [CP-20g] GET /empresa-usuarios/:id sin token | 200 | 3 | FALLIDO |
| [CP-20h] POST /auditoria sin token (inyección de registros falsos) | 500 | 6 | FALLIDO |
| [CP-20i] POST /contratos sin token | 500 | 14 | FALLIDO |
| [CP-20j] DELETE /contratos/:id sin token | 404 | 10 | APROBADO |
| [CP-20k] GET /clientes sin token (control existente) | 401 | 4002 | APROBADO |
| [CP-08a] Editor no puede crear clientes vía API | 201 | 7 | FALLIDO |
| [CP-08b] Editor no puede eliminar clientes vía API | 200 | 3 | FALLIDO |
| [CP-07] Editor no puede crear usuarios con rol administrador | 201 | 7 | FALLIDO |
| [CP-13a] Empresa B no ve clientes de empresa A (control existente) | 404 | 3 | APROBADO |
| [CP-13b] Empresa B no puede leer contratos de empresa A | 200 | 2 | FALLIDO |
| [CP-13c] Empresa B no puede descargar documentos de empresa A | 200 | 4 | FALLIDO |
| [CP-13d] Empresa B no puede leer datos de empresa A | 200 | 2 | FALLIDO |
| [CP-19] Auditoría de empresa B no expone eventos de empresa A | 200 | 2 | FALLIDO |
| [CP-23a] Cabeceras de seguridad HTTP presentes | 200 | 1 | FALLIDO |
| [CP-23b] CORS no acepta orígenes arbitrarios | 200 | 2 | FALLIDO |
| [CP-24] Errores no exponen detalles internos (SQL/stack) | 500 | 3 | FALLIDO |
| [CP-15] Carga de archivo no permitido (.exe) es rechazada | 201 | 15 | FALLIDO |
| [CP-24b] Documentación Swagger no expuesta públicamente en producción | 200 | 3 | FALLIDO |
| [CP-27a] GET / (salud de la API) | 200 | 3 | APROBADO |
| [CP-27b] POST /autenticacion/login | 200 | 4010 | PARCIAL |
| [CP-27c] GET /clientes | 200 | 4006 | PARCIAL |
| [CP-27d] GET /contratos | 200 | 4007 | PARCIAL |
| [CP-27e] GET /metricas | 200 | 4010 | PARCIAL |
| [CP-27f] GET /clientes/:id | 200 | 3 | APROBADO |

## 6. Lighthouse (/login)

performance: **56** | accessibility: **96** | best-practices: **100** | seo: **83**

first-contentful-paint: 4.4 s | largest-contentful-paint: 7.8 s | total-blocking-time: 370 ms | cumulative-layout-shift: 0 | speed-index: 4.4 s | interactive: 7.8 s

## 7. Carga (k6)

VUs máx: 200 | Peticiones: 4269 | RPS: 41.1 | Errores: 0.00%

| Umbral | Resultado |
|---|---|
| http_req_failed rate<0.01 | OK |
| t_obtener_cliente p(95)<300 | OK |
| http_req_duration{tipo:crud} p(95)<300 | FALLA |
| t_listar_clientes p(95)<300 | FALLA |

## 8. DAST (OWASP ZAP)

**zap-api**: Alto 1 | Medio 1 | Bajo 5 | Info 3

| Alerta | Riesgo | CWE | Instancias |
|---|---|---|---|
| SQL Injection | Alto | 89 | 1 |
| Cross-Domain Misconfiguration | Medio | 264 | 5 |
| A Server Error response code was returned by the server | Bajo | 388 | 7 |
| Application Error Disclosure | Bajo | 550 | 4 |
| Server Leaks Information via "X-Powered-By" HTTP Response Header Field(s) | Bajo | 497 | 5 |
| Unexpected Content-Type was returned | Bajo | -1 | 12 |
| X-Content-Type-Options Header Missing | Bajo | 693 | 5 |
| A Client Error response code was returned by the server | Informativo | 388 | 47 |
| Non-Storable Content | Informativo | 524 | 5 |
| Storable and Cacheable Content | Informativo | 524 | 2 |

**zap-frontend**: Alto 0 | Medio 3 | Bajo 7 | Info 2

| Alerta | Riesgo | CWE | Instancias |
|---|---|---|---|
| Content Security Policy (CSP) Header Not Set | Medio | 693 | 3 |
| Missing Anti-clickjacking Header | Medio | 1021 | 1 |
| Sub Resource Integrity Attribute Missing | Medio | 345 | 5 |
| Cross-Origin-Embedder-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Cross-Origin-Opener-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Cross-Origin-Resource-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Permissions Policy Header Not Set | Bajo | 693 | 4 |
| Server Leaks Version Information via "Server" HTTP Response Header Field | Bajo | 497 | 5 |
| Timestamp Disclosure - Unix | Bajo | 497 | 1 |
| X-Content-Type-Options Header Missing | Bajo | 693 | 5 |
| Modern Web Application | Informativo | -1 | 3 |
| Storable and Cacheable Content | Informativo | 524 | 5 |

## Quality gate

**NO SUPERADO** - la versión no puede liberarse:

- SAST semgrep-owasp: 1 hallazgos de severidad ERROR
- SAST semgrep-atlas: 12 hallazgos de severidad ERROR
- Gitleaks: 1 secretos en el repositorio
- npm audit backend: 1 críticas / 4 altas
- npm audit frontend: 0 críticas / 4 altas
- Newman: 37 aserciones fallidas
- k6: umbral http_req_duration{tipo:crud} p(95)<300 no cumplido
- k6: umbral t_listar_clientes p(95)<300 no cumplido
- ZAP zap-api: 1 alertas de riesgo alto
