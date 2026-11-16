# Resumen DevSecOps - Sistema de Gestión Atlas

## 1. SAST (Semgrep)

| Ruleset | Total | ERROR | WARNING | INFO |
|---|---|---|---|---|
| semgrep-owasp | 1 | 1 | 0 | 0 |
| semgrep-atlas | 61 | 12 | 49 | 0 |

## 2. Secretos (Gitleaks)

Secretos detectados en el historial: **39**

## 3. Dependencias (npm audit / Trivy)

| Componente | Crítica | Alta | Moderada | Baja |
|---|---|---|---|---|
| npm backend | 1 | 4 | 2 | 0 |
| npm frontend | 0 | 4 | 2 | 0 |
| Trivy (vuln.) | 1 | 34 | 36 | 4 |
| Trivy (config. Docker) | 0 | 2 | 0 | 2 |

Secretos detectados por Trivy: 0

## 4. Pruebas API automatizadas (Newman)

Peticiones: 52 | Aserciones: 70 | Aprobadas: 34 | Fallidas: 36

| Caso | HTTP | ms | Resultado |
|---|---|---|---|
| [CP-01] Inicio de sesión exitoso entrega JWT válido | 200 | 4008 | APROBADO |
| [CP-02] Credenciales inválidas son rechazadas | 401 | 4006 | APROBADO |
| [CP-10] Crear cliente con datos válidos | 201 | 6 | APROBADO |
| [CP-10b] Rechazar cliente con correo, RUT y teléfono inválidos | 201 | 5 | FALLIDO |
| [CP-11] Listar clientes de la empresa | 200 | 4009 | APROBADO |
| [CP-11b] Buscar cliente por nombre | 200 | 5 | APROBADO |
| [CP-14] Crear contrato con documento PDF asociado a un cliente | 201 | 11 | APROBADO |
| [CP-14b] Rechazar contrato con fecha de término anterior a la de inicio | 201 | 4 | FALLIDO |
| [CP-16] Descargar documento del contrato (usuario autorizado) | 200 | 4 | APROBADO |
| [CP-17] Listar contratos con estado calculado | 200 | 4005 | PARCIAL |
| [CP-12] Crear cliente desechable para prueba de eliminación | 201 | 5 | APROBADO |
| [CP-12] Eliminar cliente (debe ser eliminación lógica) | 200 | 5 | PARCIAL |
| [SEC-AUT-01] Inyección SQL en login es rechazada | 401 | 4008 | APROBADO |
| [SEC-AUT-02] JWT con algoritmo 'none' es rechazado | 401 | 4006 | APROBADO |
| [SEC-AUT-03] JWT forjado con secreto por defecto es rechazado | 200 | 4008 | FALLIDO |
| [CP-05] Registro con contraseña débil es rechazado | 201 | 3 | FALLIDO |
| [CP-03] Existe endpoint de cierre de sesión con revocación del token | 404 | 3 | FALLIDO |
| [CP-20a] GET /contratos/:id sin token | 200 | 3 | FALLIDO |
| [CP-20b] GET /contratos/:id/file sin token (descarga de documento) | 200 | 2 | FALLIDO |
| [CP-20c] GET /usuarios/:id sin token | 200 | 1 | FALLIDO |
| [CP-20d] GET /empresas sin token | 200 | 2 | FALLIDO |
| [CP-20e] GET /roles sin token | 200 | 1 | FALLIDO |
| [CP-20f] GET /auditoria sin token | 200 | 2 | FALLIDO |
| [CP-20g] GET /empresa-usuarios/:id sin token | 200 | 3 | FALLIDO |
| [CP-20h] POST /auditoria sin token (inyección de registros falsos) | 500 | 5 | FALLIDO |
| [CP-20i] POST /contratos sin token | 500 | 10 | FALLIDO |
| [CP-20j] Preparación: administrador crea contrato desechable | 201 | 9 | APROBADO |
| [CP-20j] DELETE /contratos/:id sin token | 500 | 3 | FALLIDO |
| [CP-20k] GET /clientes sin token (control existente) | 401 | 4002 | APROBADO |
| [CP-08a] Editor no puede crear clientes vía API | 201 | 11 | FALLIDO |
| [CP-08b] Editor no puede eliminar clientes vía API | 200 | 4 | FALLIDO |
| [CP-07] Editor no puede crear usuarios con rol administrador | 201 | 5 | FALLIDO |
| [CP-13a] Empresa B no ve clientes de empresa A (control existente) | 404 | 3 | APROBADO |
| [CP-13b] Empresa B no puede leer contratos de empresa A | 200 | 1 | FALLIDO |
| [CP-13c] Empresa B no puede descargar documentos de empresa A | 200 | 2 | FALLIDO |
| [CP-13d] Empresa B no puede leer datos de empresa A | 200 | 1 | FALLIDO |
| [CP-19] Auditoría de empresa B no expone eventos de empresa A | 200 | 1 | FALLIDO |
| [CP-23a] Cabeceras de seguridad HTTP presentes | 200 | 2 | FALLIDO |
| [CP-23b] CORS no acepta orígenes arbitrarios | 200 | 2 | FALLIDO |
| [CP-24] Errores no exponen detalles internos (SQL/stack) | 500 | 3 | FALLIDO |
| [CP-15] Carga de archivo no permitido (.exe) es rechazada | 201 | 20 | FALLIDO |
| [CP-24b] Documentación Swagger no expuesta públicamente en producción | 200 | 2 | FALLIDO |
| [CP-27a] GET / (salud de la API) | 200 | 1 | APROBADO |
| [CP-27b] POST /autenticacion/login | 200 | 4008 | PARCIAL |
| [CP-27c] GET /clientes | 200 | 4009 | PARCIAL |
| [CP-27d] GET /contratos | 200 | 4008 | PARCIAL |
| [CP-27e] GET /metricas | 200 | 4009 | PARCIAL |
| [CP-27f] GET /clientes/:id | 200 | 3 | APROBADO |

## 5. Pruebas E2E / accesibilidad (Playwright + axe)

| Prueba | Navegador | Estado | ms |
|---|---|---|---|
| [E2E-01] Login de administrador y navegación a Clientes @compat | chromium-escritorio | passed | 9930 |
| [E2E-02] Credenciales inválidas muestran error y no ingresan | chromium-escritorio | passed | 6602 |
| [E2E-03] Credenciales por defecto no deben mostrarse en la pantalla de login | chromium-escritorio | passed | 527 |
| [E2E-04] Usuario editor no puede acceder al formulario de nuevo cliente | chromium-escritorio | failed | 21697 |
| [E2E-05] Token y rol no se almacenan en localStorage manipulable | chromium-escritorio | failed | 4589 |
| [E2E-06] Accesibilidad WCAG 2.1 AA en /login | chromium-escritorio | failed | 2309 |
| [E2E-06] Accesibilidad WCAG 2.1 AA en /home | chromium-escritorio | failed | 6672 |
| [E2E-06] Accesibilidad WCAG 2.1 AA en /clientes | chromium-escritorio | failed | 11344 |
| [E2E-07] Interfaz responsiva en móvil sin desplazamiento horizontal @compat | chromium-escritorio | passed | 447 |
| [E2E-01] Login de administrador y navegación a Clientes @compat | firefox-escritorio | passed | 10472 |
| [E2E-07] Interfaz responsiva en móvil sin desplazamiento horizontal @compat | firefox-escritorio | passed | 605 |
| [E2E-01] Login de administrador y navegación a Clientes @compat | webkit-movil | passed | 19228 |
| [E2E-07] Interfaz responsiva en móvil sin desplazamiento horizontal @compat | webkit-movil | passed | 1476 |

## 6. Lighthouse (/login)

performance: **61** | accessibility: **96** | best-practices: **100** | seo: **83**

first-contentful-paint: 4.4 s | largest-contentful-paint: 7.8 s | total-blocking-time: 230 ms | cumulative-layout-shift: 0 | speed-index: 4.4 s | interactive: 7.8 s

## 7. Carga (k6)

VUs máx: 200 | Peticiones: 4243 | RPS: 41.3 | Errores: 0.00%

| Umbral | Resultado |
|---|---|
| http_req_failed rate<0.01 | OK |
| http_req_duration{tipo:crud} p(95)<300 | FALLA |
| t_obtener_cliente p(95)<300 | OK |
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
| Unexpected Content-Type was returned | Bajo | -1 | 5 |
| X-Content-Type-Options Header Missing | Bajo | 693 | 5 |
| A Client Error response code was returned by the server | Informativo | 388 | 40 |
| Non-Storable Content | Informativo | 524 | 5 |
| Storable and Cacheable Content | Informativo | 524 | 2 |

**zap-frontend**: Alto 0 | Medio 3 | Bajo 7 | Info 2

| Alerta | Riesgo | CWE | Instancias |
|---|---|---|---|
| Content Security Policy (CSP) Header Not Set | Medio | 693 | 3 |
| Missing Anti-clickjacking Header | Medio | 1021 | 3 |
| Sub Resource Integrity Attribute Missing | Medio | 345 | 5 |
| Cross-Origin-Embedder-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Cross-Origin-Opener-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Cross-Origin-Resource-Policy Header Missing or Invalid | Bajo | 693 | 3 |
| Permissions Policy Header Not Set | Bajo | 693 | 4 |
| Server Leaks Version Information via "Server" HTTP Response Header Field | Bajo | 497 | 5 |
| Timestamp Disclosure - Unix | Bajo | 497 | 1 |
| X-Content-Type-Options Header Missing | Bajo | 693 | 5 |
| Modern Web Application | Informativo | -1 | 3 |
| Storable and Cacheable Content | Informativo | 524 | 4 |

## Quality gate

**NO SUPERADO** - la versión no puede liberarse:

- SAST semgrep-owasp: 1 hallazgos de severidad ERROR
- SAST semgrep-atlas: 12 hallazgos de severidad ERROR
- Gitleaks: 39 secretos en el repositorio
- npm audit backend: 1 críticas / 4 altas
- npm audit frontend: 0 críticas / 4 altas
- Newman: 36 aserciones fallidas
- k6: umbral http_req_duration{tipo:crud} p(95)<300 no cumplido
- k6: umbral t_listar_clientes p(95)<300 no cumplido
- ZAP zap-api: 1 alertas de riesgo alto
