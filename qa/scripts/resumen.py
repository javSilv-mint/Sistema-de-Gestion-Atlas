#!/usr/bin/env python3
"""Consolida los reportes del pipeline DevSecOps de Atlas en RESUMEN.md / resumen.json
y evalúa la puerta de calidad (quality gate) definida en el plan de pruebas (EP3, sección 3.3)."""
import json, sys, os, re, glob
from collections import Counter

R = sys.argv[1] if len(sys.argv) > 1 else "reportes"
res, md, gate = {}, [], []


def load(p):
    try:
        with open(os.path.join(R, p), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


md.append("# Resumen DevSecOps - Sistema de Gestión Atlas\n")

# ---------------- SAST
sast = {}
for nombre in ["semgrep-owasp", "semgrep-atlas"]:
    d = load(f"sast/{nombre}.json")
    if d is None:
        continue
    sev = Counter(r["extra"].get("severity", "?") for r in d.get("results", []))
    reglas = Counter(r["check_id"].split(".")[-1] for r in d.get("results", []))
    sast[nombre] = {"total": len(d.get("results", [])), "severidad": dict(sev), "reglas": dict(reglas.most_common(25)),
                    "errores_motor": len(d.get("errors", []))}
res["sast"] = sast
md.append("## 1. SAST (Semgrep)\n")
md.append("| Ruleset | Total | ERROR | WARNING | INFO |\n|---|---|---|---|---|")
for k, v in sast.items():
    s = v["severidad"]
    md.append(f"| {k} | {v['total']} | {s.get('ERROR',0)} | {s.get('WARNING',0)} | {s.get('INFO',0)} |")
    if s.get("ERROR", 0):
        gate.append(f"SAST {k}: {s['ERROR']} hallazgos de severidad ERROR")
md.append("")

# ---------------- Secretos
gl = load("secretos/gitleaks.json")
if gl is not None:
    res["gitleaks"] = {"total": len(gl), "reglas": dict(Counter(x.get("RuleID") for x in gl)),
                       "archivos": sorted({x.get("File") for x in gl})[:20]}
    md.append(f"## 2. Secretos (Gitleaks)\n\nSecretos detectados en el historial: **{len(gl)}**\n")
    if gl:
        gate.append(f"Gitleaks: {len(gl)} secretos en el repositorio")

# ---------------- SCA
md.append("## 3. Dependencias (npm audit / Trivy)\n")
md.append("| Componente | Crítica | Alta | Moderada | Baja |\n|---|---|---|---|---|")
res["npm_audit"] = {}
for comp in ["backend", "frontend"]:
    d = load(f"sca/npm-audit-{comp}.json")
    if not d:
        continue
    v = d.get("metadata", {}).get("vulnerabilities", {})
    paquetes = {k: x.get("severity") for k, x in d.get("vulnerabilities", {}).items()}
    res["npm_audit"][comp] = {"conteo": v, "paquetes": paquetes}
    md.append(f"| npm {comp} | {v.get('critical',0)} | {v.get('high',0)} | {v.get('moderate',0)} | {v.get('low',0)} |")
    if v.get("critical", 0) or v.get("high", 0):
        gate.append(f"npm audit {comp}: {v.get('critical',0)} críticas / {v.get('high',0)} altas")
tv = load("sca/trivy.json")
if tv:
    vc, mc, sc = Counter(), Counter(), 0
    mis = []
    for r in tv.get("Results", []) or []:
        for x in r.get("Vulnerabilities") or []:
            vc[x["Severity"]] += 1
        for x in r.get("Misconfigurations") or []:
            mc[x["Severity"]] += 1
            mis.append({"archivo": r.get("Target"), "id": x.get("ID"), "titulo": x.get("Title"), "sev": x.get("Severity")})
        sc += len(r.get("Secrets") or [])
    res["trivy"] = {"vulnerabilidades": dict(vc), "misconfig": dict(mc), "secretos": sc, "detalle_misconfig": mis[:40]}
    md.append(f"| Trivy (vuln.) | {vc.get('CRITICAL',0)} | {vc.get('HIGH',0)} | {vc.get('MEDIUM',0)} | {vc.get('LOW',0)} |")
    md.append(f"| Trivy (config. Docker) | {mc.get('CRITICAL',0)} | {mc.get('HIGH',0)} | {mc.get('MEDIUM',0)} | {mc.get('LOW',0)} |")
    md.append(f"\nSecretos detectados por Trivy: {sc}")
md.append("")

# ---------------- Newman
nw = load("api/newman-resultados.json")
if nw:
    run = nw["run"]
    casos = []
    for ex in run.get("executions", []):
        nombre = ex["item"]["name"]
        asserts = ex.get("assertions", []) or []
        fallas = [a for a in asserts if a.get("error")]
        casos.append({"caso": nombre, "metodo": ex["request"]["method"],
                      "status": (ex.get("response") or {}).get("code"),
                      "ms": (ex.get("response") or {}).get("responseTime"),
                      "aserciones": len(asserts), "fallidas": len(fallas),
                      "detalle": [f"{a['assertion']}: {a['error']['message']}" for a in fallas]})
    st = run["stats"]
    res["newman"] = {"peticiones": st["requests"], "aserciones": st["assertions"], "casos": casos,
                     "duracion_ms": run["timings"].get("completed", 0) - run["timings"].get("started", 0)}
    ok = st["assertions"]["total"] - st["assertions"]["failed"]
    md.append("## 4. Pruebas API automatizadas (Newman)\n")
    md.append(f"Peticiones: {st['requests']['total']} | Aserciones: {st['assertions']['total']} | "
              f"Aprobadas: {ok} | Fallidas: {st['assertions']['failed']}\n")
    md.append("| Caso | HTTP | ms | Resultado |\n|---|---|---|---|")
    for c in casos:
        if c["caso"].startswith("PREP"):
            continue
        r_ = "APROBADO" if c["fallidas"] == 0 else ("FALLIDO" if c["fallidas"] == c["aserciones"] else "PARCIAL")
        md.append(f"| {c['caso']} | {c['status']} | {c['ms']} | {r_} |")
    if st["assertions"]["failed"]:
        gate.append(f"Newman: {st['assertions']['failed']} aserciones fallidas")
    md.append("")

# ---------------- Playwright
pw = load("e2e/resultados-e2e.json")
if pw:
    tests = []
    def walk(s):
        for sp in s.get("specs", []):
            for tt in sp.get("tests", []):
                rr = (tt.get("results") or [{}])[-1]
                tests.append({"titulo": sp["title"], "proyecto": tt.get("projectName"), "estado": rr.get("status"),
                              "ms": rr.get("duration"), "error": ((rr.get("error") or {}).get("message") or "")[:400]})
        for c in s.get("suites", []):
            walk(c)
    for s in pw.get("suites", []):
        walk(s)
    res["playwright"] = {"stats": pw.get("stats"), "tests": tests}
    md.append("## 5. Pruebas E2E / accesibilidad (Playwright + axe)\n")
    md.append("| Prueba | Navegador | Estado | ms |\n|---|---|---|---|")
    for x in tests:
        md.append(f"| {x['titulo']} | {x['proyecto']} | {x['estado']} | {x['ms']} |")
    md.append("")
axe = {}
for f in glob.glob(os.path.join(R, "e2e/capturas/E2E-06-axe-*.json")):
    try:
        axe[os.path.basename(f)] = json.load(open(f, encoding="utf-8"))
    except Exception:
        pass
res["axe"] = axe

# ---------------- Lighthouse
lh = load("lighthouse/login.report.json")
if lh:
    cats = {k: round((v.get("score") or 0) * 100) for k, v in lh["categories"].items()}
    au = lh["audits"]
    met = {k: au[k]["displayValue"] for k in ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index", "interactive"] if k in au}
    fallas_a11y = [au[r["id"]]["title"] for r in lh["categories"]["accessibility"]["auditRefs"] if r.get("weight", 0) > 0 and au[r["id"]].get("score") == 0]
    res["lighthouse"] = {"puntajes": cats, "metricas": met, "a11y_fallas": fallas_a11y}
    md.append("## 6. Lighthouse (/login)\n")
    md.append(" | ".join(f"{k}: **{v}**" for k, v in cats.items()) + "\n")
    md.append(" | ".join(f"{k}: {v}" for k, v in met.items()) + "\n")

# ---------------- k6
k6 = load("rendimiento/k6-resumen.json")
if k6:
    m = k6["metrics"]
    def tr(k):
        v = m.get(k, {}).get("values", {})
        return {x: round(v.get(x, 0), 1) for x in ["avg", "med", "p(90)", "p(95)", "max"]} if v else None
    th = []
    for k, v in m.items():
        for name, r in (v.get("thresholds") or {}).items():
            th.append({"metrica": k, "umbral": name, "ok": r.get("ok")})
    res["k6"] = {"vus_max": m.get("vus_max", {}).get("values", {}).get("max"),
                 "peticiones": m["http_reqs"]["values"]["count"], "rps": round(m["http_reqs"]["values"]["rate"], 1),
                 "error_rate": m["http_req_failed"]["values"]["rate"], "iteraciones": m.get("iterations", {}).get("values", {}).get("count"),
                 "listar_clientes": tr("t_listar_clientes"), "obtener_cliente": tr("t_obtener_cliente"),
                 "listar_contratos": tr("t_listar_contratos"), "login": tr("t_login"), "http_req_duration": tr("http_req_duration"),
                 "umbrales": th}
    md.append("## 7. Carga (k6)\n")
    md.append(f"VUs máx: {res['k6']['vus_max']} | Peticiones: {res['k6']['peticiones']} | RPS: {res['k6']['rps']} | Errores: {res['k6']['error_rate']*100:.2f}%\n")
    md.append("| Umbral | Resultado |\n|---|---|")
    for x in th:
        md.append(f"| {x['metrica']} {x['umbral']} | {'OK' if x['ok'] else 'FALLA'} |")
        if not x["ok"]:
            gate.append(f"k6: umbral {x['metrica']} {x['umbral']} no cumplido")
    md.append("")

# ---------------- ZAP
md.append("## 8. DAST (OWASP ZAP)\n")
res["zap"] = {}
riesgo = {"3": "Alto", "2": "Medio", "1": "Bajo", "0": "Informativo"}
for nombre in ["zap-api", "zap-frontend"]:
    d = load(f"dast/{nombre}.json")
    if not d:
        continue
    alertas = []
    for site in d.get("site", []):
        for a in site.get("alerts", []):
            alertas.append({"alerta": a.get("name") or a.get("alert"), "riesgo": riesgo.get(str(a.get("riskcode")), a.get("riskcode")),
                            "cwe": a.get("cweid"), "instancias": int(a.get("count") or len(a.get("instances", [])))})
    c = Counter(a["riesgo"] for a in alertas)
    res["zap"][nombre] = {"conteo": dict(c), "alertas": alertas}
    md.append(f"**{nombre}**: Alto {c.get('Alto',0)} | Medio {c.get('Medio',0)} | Bajo {c.get('Bajo',0)} | Info {c.get('Informativo',0)}\n")
    md.append("| Alerta | Riesgo | CWE | Instancias |\n|---|---|---|---|")
    for a in sorted(alertas, key=lambda x: ["Alto", "Medio", "Bajo", "Informativo"].index(x["riesgo"]) if x["riesgo"] in riesgo.values() else 9):
        md.append(f"| {a['alerta']} | {a['riesgo']} | {a['cwe']} | {a['instancias']} |")
    md.append("")
    if c.get("Alto", 0):
        gate.append(f"ZAP {nombre}: {c['Alto']} alertas de riesgo alto")

# ---------------- Gate
for clave, nombre in [("newman", "pruebas API"), ("sast", "SAST")]:
    if not res.get(clave):
        gate.append(f"Sin evidencia de {nombre}: el reporte no se generó")
md.append("## Quality gate\n")
if gate:
    md.append("**NO SUPERADO** - la versión no puede liberarse:\n")
    md += [f"- {g}" for g in gate]
    with open(os.path.join(R, "GATE_FALLIDO"), "w", encoding="utf-8") as f:
        f.write("\n".join(gate) + "\n")
else:
    md.append("**SUPERADO**")
res["gate"] = {"superado": not gate, "motivos": gate}

with open(os.path.join(R, "resumen.json"), "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=2)
with open(os.path.join(R, "RESUMEN.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(md) + "\n")
print("\n".join(md))
