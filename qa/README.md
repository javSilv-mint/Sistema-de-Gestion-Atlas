# QA y DevSecOps - Sistema de Gestión Atlas (ISY1102 EP5)

Kit de pruebas automatizadas y pipeline de seguridad continua para Atlas.

| Carpeta | Herramienta | Qué verifica |
|---|---|---|
| `.github/workflows/devsecops-atlas.yml` | GitHub Actions | Orquesta todas las pruebas en cada push / PR / semanalmente |
| `qa/semgrep/` | Semgrep (SAST) | Reglas propias de Atlas + rulesets OWASP Top 10, JavaScript, JWT y secretos |
| `qa/postman/` | Postman / Newman | 51 peticiones: funcionales, autenticación, control de acceso, multi-tenant, configuración, tiempos |
| `qa/e2e/` | Playwright + axe-core | Flujos de interfaz, roles, accesibilidad WCAG 2.1 AA, móvil y 3 navegadores |
| `qa/k6/` | k6 | Carga con 200 usuarios concurrentes (NFR-PERF-1 y NFR-PERF-3) |
| (workflow) | OWASP ZAP | DAST: baseline del frontend y escaneo activo de la API (OpenAPI) |
| (workflow) | Gitleaks, npm audit, Trivy | Secretos, dependencias vulnerables y configuración de Docker |
| `qa/scripts/resumen.py` | Python | Consolida resultados y aplica la puerta de calidad |

## Cómo ejecutarlo

1. Copiar las carpetas `.github/` y `qa/` en la raíz del repositorio (al lado de `CodigoFuenteA/`).
2. `git add .github qa && git commit -m "Pipeline DevSecOps EP5" && git push`
3. En GitHub > pestaña **Actions** > *DevSecOps Atlas* se ve la ejecución (≈ 25-35 min).
4. Al terminar, los reportes quedan en la rama **`qa-reportes`** (RESUMEN.md, HTML de Newman, ZAP, Lighthouse, Playwright, k6).

El pipeline termina en rojo mientras existan hallazgos críticos: es el comportamiento esperado
de la puerta de calidad (bloquea la liberación).

## Ejecución local (Codespaces)

```bash
docker compose -f CodigoFuenteA/docker-compose.yml up -d --build
npm i -g newman newman-reporter-htmlextra
newman run qa/postman/atlas-ep5.postman_collection.json -e qa/postman/atlas-ci.postman_environment.json --working-dir qa/data -r cli,htmlextra
```
