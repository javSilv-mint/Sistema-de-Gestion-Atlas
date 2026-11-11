// Prueba de carga y concurrencia de Atlas (CP-27 / CP-29) con k6.
// Umbrales tomados del ERS v1.1:
//   NFR-PERF-1: operaciones CRUD simples con p95 < 300 ms
//   NFR-PERF-3: soportar 200 usuarios concurrentes sin errores (< 1 %)
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:4450";
const VUS = Number(__ENV.VUS_MAX || 200);

const tLogin = new Trend("t_login", true);
const tClientes = new Trend("t_listar_clientes", true);
const tContratos = new Trend("t_listar_contratos", true);
const tCliente = new Trend("t_obtener_cliente", true);

export const options = {
  scenarios: {
    concurrencia: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: Math.round(VUS / 4) },
        { duration: "20s", target: VUS },
        { duration: "40s", target: VUS },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{tipo:crud}": ["p(95)<300"],
    t_listar_clientes: ["p(95)<300"],
    t_obtener_cliente: ["p(95)<300"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
};

export function setup() {
  const r = http.post(`${BASE}/autenticacion/login`, JSON.stringify({ nombre_usuario: "admin", password: "admin" }), {
    headers: { "Content-Type": "application/json" },
  });
  return { token: r.json("token") };
}

export default function (data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` }, tags: { tipo: "crud" } };

  group("Listar clientes", () => {
    const r = http.get(`${BASE}/clientes`, auth);
    tClientes.add(r.timings.duration);
    check(r, { "clientes 200": (x) => x.status === 200 });
  });
  group("Obtener cliente por id", () => {
    const r = http.get(`${BASE}/clientes/1`, auth);
    tCliente.add(r.timings.duration);
    check(r, { "cliente 200": (x) => x.status === 200 });
  });
  group("Listar contratos", () => {
    const r = http.get(`${BASE}/contratos`, auth);
    tContratos.add(r.timings.duration);
    check(r, { "contratos 200": (x) => x.status === 200 });
  });
  // 1 de cada 10 iteraciones inicia sesión (flujo realista)
  if (Math.random() < 0.1) {
    group("Login", () => {
      const r = http.post(`${BASE}/autenticacion/login`, JSON.stringify({ nombre_usuario: "admin", password: "admin" }), {
        headers: { "Content-Type": "application/json" }, tags: { tipo: "auth" },
      });
      tLogin.add(r.timings.duration);
      check(r, { "login 200": (x) => x.status === 200 });
    });
  }
  sleep(1);
}

export function handleSummary(data) {
  return {
    "k6-resumen.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(d) {
  const m = d.metrics;
  const f = (k) => (m[k] ? `avg=${m[k].values.avg.toFixed(0)}ms p95=${m[k].values["p(95)"].toFixed(0)}ms max=${m[k].values.max.toFixed(0)}ms` : "n/d");
  const lines = [
    "==== RESUMEN k6 ATLAS ====",
    `VUs máx: ${m.vus_max ? m.vus_max.values.max : "?"}  peticiones: ${m.http_reqs.values.count}  tasa: ${m.http_reqs.values.rate.toFixed(1)}/s`,
    `Errores HTTP: ${(m.http_req_failed.values.rate * 100).toFixed(2)} %`,
    `Listar clientes   ${f("t_listar_clientes")}`,
    `Obtener cliente   ${f("t_obtener_cliente")}`,
    `Listar contratos  ${f("t_listar_contratos")}`,
    `Login             ${f("t_login")}`,
    "Umbrales:",
    ...Object.entries(m).filter(([, v]) => v.thresholds).flatMap(([k, v]) => Object.entries(v.thresholds).map(([th, r]) => `  ${r.ok ? "OK   " : "FALLA"} ${k} ${th}`)),
  ];
  return lines.join("\n") + "\n";
}
