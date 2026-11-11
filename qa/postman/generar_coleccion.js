// Genera la colección Postman/Newman de pruebas automatizadas de Atlas (EP5).
// Uso: node qa/postman/generar_coleccion.js  -> escribe atlas-ep5.postman_collection.json
// Cada prueba valida el comportamiento SEGURO/ESPERADO según el ERS v1.1.
// Si la aplicación no lo cumple, la aserción falla y queda como hallazgo.
const fs = require("fs");
const path = require("path");

const J = { key: "Content-Type", value: "application/json" };
const AUTH = (v) => ({ key: "Authorization", value: `Bearer {{${v}}}` });

function req(name, method, url, { headers = [], body, formdata, tests = [], pre = [] } = {}) {
  const r = {
    name,
    event: [],
    request: {
      method,
      header: headers,
      url: { raw: `{{base_url}}${url}`, host: ["{{base_url}}"], path: url.replace(/^\//, "").split("?")[0].split("/") },
    },
  };
  const q = url.split("?")[1];
  if (q) r.request.url.query = q.split("&").map((kv) => { const [key, value] = kv.split("="); return { key, value }; });
  if (body !== undefined) r.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
  if (formdata) r.request.body = { mode: "formdata", formdata };
  if (pre.length) r.event.push({ listen: "prerequest", script: { type: "text/javascript", exec: pre } });
  if (tests.length) r.event.push({ listen: "test", script: { type: "text/javascript", exec: tests } });
  return r;
}
const t = (name, body) => `pm.test(${JSON.stringify(name)}, function () { ${body} });`;
const status = (code, label) => t(label || `Responde HTTP ${code}`, `pm.response.to.have.status(${code});`);
const denied = (label) => t(label, `pm.expect(pm.response.code, 'Se esperaba 401/403/404 y se obtuvo ' + pm.response.code).to.be.oneOf([401, 403, 404]);`);
const fast = (ms, label) => t(label || `Tiempo de respuesta < ${ms} ms (NFR-PERF-1)`, `pm.expect(pm.response.responseTime).to.be.below(${ms});`);

const folders = [];

// ---------------------------------------------------------------- 00 Preparación
folders.push({
  name: "00 Preparación de datos",
  item: [
    req("PREP Login administrador (admin)", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "{{admin_user}}", password: "{{admin_pass}}" },
      tests: [status(200), `pm.environment.set('token_admin', pm.response.json().token);`],
    }),
    req("PREP Login editor (editor)", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "{{editor_user}}", password: "{{editor_pass}}" },
      tests: [status(200), `pm.environment.set('token_editor', pm.response.json().token);`],
    }),
    req("PREP Registrar empresa B (segundo tenant)", "POST", "/empresas", {
      headers: [J],
      pre: [`const s = Date.now(); pm.environment.set('b_user', 'qa_empresa_b_' + s); pm.environment.set('b_pass', 'Qa#Atlas2026!'); pm.environment.set('b_sufijo', s);`],
      body: { usuario: { nombre_usuario: "{{b_user}}", contrasena_hash: "{{b_pass}}", correo: "{{b_user}}@qa.test" }, empresa: { nombre: "Empresa QA B {{b_sufijo}}", correo: "empresa_b_{{b_sufijo}}@qa.test" } },
      tests: [status(201)],
    }),
    req("PREP Login usuario empresa B", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "{{b_user}}", password: "{{b_pass}}" },
      tests: [status(200), `pm.environment.set('token_b', pm.response.json().token);`],
    }),
  ],
});

// ---------------------------------------------------------------- 01 Funcionales
const clienteValido = (sufijo) => ({
  nombre: `Cliente QA ${sufijo}`, correo: `cliente.${sufijo}@qa.test`, telefono: "912345678", direccion: "Av. Prueba 123, Santiago",
  es_empresa: true, rut: "76.123.456-0", nombre_fantasia: "QA SpA", nombre_banco: "Banco QA", numero_cuenta: "000123456", titular_cuenta: "QA SpA",
});
folders.push({
  name: "01 Pruebas funcionales (API)",
  item: [
    req("[CP-01] Inicio de sesión exitoso entrega JWT válido", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "{{admin_user}}", password: "{{admin_pass}}" },
      tests: [status(200),
        t("La respuesta contiene un JWT con 3 segmentos", `const tk = pm.response.json().token; pm.expect(tk).to.be.a('string'); pm.expect(tk.split('.').length).to.eql(3);`),
        t("El JWT incluye empresaId y expira en ≤ 2 h", `const p = JSON.parse(atob(pm.response.json().token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); pm.expect(p.empresaId).to.exist; pm.expect(p.exp - p.iat).to.be.at.most(7200);`)],
    }),
    req("[CP-02] Credenciales inválidas son rechazadas", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "{{admin_user}}", password: "clave-incorrecta" },
      tests: [status(401), t("No entrega token", `pm.expect(pm.response.json().token).to.be.undefined;`)],
    }),
    req("[CP-10] Crear cliente con datos válidos", "POST", "/clientes", {
      headers: [J, AUTH("token_admin")], pre: [`pm.environment.set('sufijo', Date.now());`], body: clienteValido("{{sufijo}}"),
      tests: [status(201), t("Cliente queda asociado a la empresa del token (RB-2)", `pm.expect(pm.response.json().empresa_id).to.eql(1);`),
        `pm.environment.set('cliente_id', pm.response.json().id);`],
    }),
    req("[CP-10b] Rechazar cliente con correo, RUT y teléfono inválidos", "POST", "/clientes", {
      headers: [J, AUTH("token_admin")],
      body: { nombre: "", correo: "no-es-correo", telefono: "abc", rut: "11.111.111-K", es_empresa: true },
      tests: [status(400, "Responde HTTP 400 con detalle de validación (RF-4.3)")],
    }),
    req("[CP-11] Listar clientes de la empresa", "GET", "/clientes", {
      headers: [AUTH("token_admin")],
      tests: [status(200), t("Devuelve arreglo solo con clientes de la empresa 1", `const a = pm.response.json(); pm.expect(a).to.be.an('array'); a.forEach(c => pm.expect(c.empresa_id).to.eql(1));`)],
    }),
    req("[CP-11b] Buscar cliente por nombre", "GET", "/clientes/search?name=Cliente QA", {
      headers: [AUTH("token_admin")],
      tests: [status(200), t("Encuentra el cliente creado", `pm.expect(pm.response.json().length).to.be.above(0);`)],
    }),
    req("[CP-14] Crear contrato con documento PDF asociado a un cliente", "POST", "/contratos", {
      headers: [AUTH("token_admin")],
      formdata: [
        { key: "cliente_id", value: "{{cliente_id}}", type: "text" }, { key: "titulo", value: "Contrato QA EP5", type: "text" },
        { key: "descripcion", value: "Contrato generado por prueba automatizada", type: "text" },
        { key: "fecha_inicio", value: "2026-01-01", type: "text" }, { key: "fecha_fin", value: "2026-12-31", type: "text" },
        { key: "file", type: "file", src: "contrato_prueba.pdf" },
      ],
      tests: [status(201), `pm.environment.set('contrato_id', pm.response.json().id);`],
    }),
    req("[CP-14b] Rechazar contrato con fecha de término anterior a la de inicio", "POST", "/contratos", {
      headers: [AUTH("token_admin")],
      formdata: [
        { key: "cliente_id", value: "{{cliente_id}}", type: "text" }, { key: "titulo", value: "Contrato fechas inválidas", type: "text" },
        { key: "fecha_inicio", value: "2026-12-31", type: "text" }, { key: "fecha_fin", value: "2026-01-01", type: "text" },
      ],
      tests: [status(400, "Responde HTTP 400 por rango de fechas inválido")],
    }),
    req("[CP-16] Descargar documento del contrato (usuario autorizado)", "GET", "/contratos/{{contrato_id}}/file", {
      headers: [AUTH("token_admin")],
      tests: [status(200), t("Content-Type application/pdf", `pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf');`)],
    }),
    req("[CP-17] Listar contratos con estado calculado", "GET", "/contratos", {
      headers: [AUTH("token_admin")],
      tests: [status(200), t("Cada contrato informa su estado (activo / por vencer / expirado)", `const a = pm.response.json(); pm.expect(a.length).to.be.above(0); a.forEach(c => pm.expect(c.estado, 'contrato ' + c.id + ' sin campo estado').to.exist);`)],
    }),
    req("[CP-12] Crear cliente desechable para prueba de eliminación", "POST", "/clientes", {
      headers: [J, AUTH("token_admin")], body: clienteValido("del{{sufijo}}"),
      tests: [status(201), `pm.environment.set('cliente_del_id', pm.response.json().id);`],
    }),
    req("[CP-12] Eliminar cliente (debe ser eliminación lógica)", "DELETE", "/clientes/{{cliente_del_id}}", {
      headers: [AUTH("token_admin")],
      tests: [t("Responde 200/204", `pm.expect(pm.response.code).to.be.oneOf([200, 204]);`),
        t("La respuesta indica eliminación lógica (estado/eliminado) y no borrado físico", `const b = pm.response.text(); pm.expect(b).to.match(/eliminado|inactivo|deleted_at|estado/i);`)],
    }),
  ],
});

// ---------------------------------------------------------------- 02 Seguridad: autenticación
const forgePre = [
  "// Construye un JWT firmado con el secreto POR DEFECTO publicado en docker-compose.yml",
  "function b64url(wa){return CryptoJS.enc.Base64.stringify(wa).replace(/=+$/,'').replace(/\\+/g,'-').replace(/\\//g,'_');}",
  "const h = b64url(CryptoJS.enc.Utf8.parse(JSON.stringify({alg:'HS256',typ:'JWT'})));",
  "const p = b64url(CryptoJS.enc.Utf8.parse(JSON.stringify({usuarioId:1,nombreUsuario:'atacante',empresaUsuarioId:1,empresaId:1,iat:Math.floor(Date.now()/1000)})));",
  "const s = b64url(CryptoJS.HmacSHA256(h + '.' + p, pm.environment.get('jwt_secret_publico')));",
  "pm.environment.set('token_forjado', h + '.' + p + '.' + s);",
  "const none = b64url(CryptoJS.enc.Utf8.parse(JSON.stringify({alg:'none',typ:'JWT'})));",
  "pm.environment.set('token_none', none + '.' + p + '.');",
];
folders.push({
  name: "02 Seguridad - Autenticación y sesión (OWASP A07/A02)",
  item: [
    req("[SEC-AUT-01] Inyección SQL en login es rechazada", "POST", "/autenticacion/login", {
      headers: [J], body: { nombre_usuario: "admin' OR '1'='1' --", password: "x' OR '1'='1" },
      tests: [status(401, "Responde 401 (consultas parametrizadas)")],
    }),
    req("[SEC-AUT-02] JWT con algoritmo 'none' es rechazado", "GET", "/clientes", {
      headers: [AUTH("token_none")], pre: forgePre,
      tests: [status(401, "Responde 401 ante token sin firma")],
    }),
    req("[SEC-AUT-03] JWT forjado con secreto por defecto es rechazado", "GET", "/clientes", {
      headers: [AUTH("token_forjado")], pre: forgePre,
      tests: [status(401, "Responde 401 (el secreto JWT no debe ser el valor por defecto público)")],
    }),
    req("[CP-05] Registro con contraseña débil es rechazado", "POST", "/empresas", {
      headers: [J], pre: [`pm.environment.set('weak', 'qa_debil_' + Date.now());`],
      body: { usuario: { nombre_usuario: "{{weak}}", contrasena_hash: "123", correo: "{{weak}}@qa.test" }, empresa: { nombre: "Empresa débil {{weak}}", correo: "{{weak}}@empresa.test" } },
      tests: [status(400, "Responde 400 por no cumplir política de contraseñas (NFR-SEG-2)")],
    }),
    req("[CP-03] Existe endpoint de cierre de sesión con revocación del token", "POST", "/autenticacion/logout", {
      headers: [AUTH("token_admin")],
      tests: [t("Responde 200/204 (logout implementado en servidor)", `pm.expect(pm.response.code).to.be.oneOf([200, 204]);`)],
    }),
  ],
});

// ---------------------------------------------------------------- 03 Seguridad: control de acceso
folders.push({
  name: "03 Seguridad - Control de acceso y aislamiento (OWASP A01)",
  item: [
    req("[CP-20a] GET /contratos/:id sin token", "GET", "/contratos/1", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20b] GET /contratos/:id/file sin token (descarga de documento)", "GET", "/contratos/{{contrato_id}}/file", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20c] GET /usuarios/:id sin token", "GET", "/usuarios/1", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20d] GET /empresas sin token", "GET", "/empresas", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20e] GET /roles sin token", "GET", "/roles", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20f] GET /auditoria sin token", "GET", "/auditoria", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20g] GET /empresa-usuarios/:id sin token", "GET", "/empresa-usuarios/1", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20h] POST /auditoria sin token (inyección de registros falsos)", "POST", "/auditoria", {
      headers: [J], body: { accion: "QA_FALSO", detalles: "registro insertado sin autenticación" }, tests: [denied("Sin token responde 401/403")],
    }),
    req("[CP-20i] POST /contratos sin token", "POST", "/contratos", {
      formdata: [{ key: "cliente_id", value: "{{cliente_id}}", type: "text" }, { key: "titulo", value: "Contrato sin token", type: "text" },
        { key: "fecha_inicio", value: "2026-01-01", type: "text" }, { key: "fecha_fin", value: "2026-12-31", type: "text" }],
      tests: [denied("Sin token responde 401/403"), `if (pm.response.code === 201) pm.environment.set('contrato_anon_id', pm.response.json().id);`],
    }),
    req("[CP-20j] DELETE /contratos/:id sin token", "DELETE", "/contratos/{{contrato_anon_id}}", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-20k] GET /clientes sin token (control existente)", "GET", "/clientes", { tests: [denied("Sin token responde 401/403")] }),
    req("[CP-08a] Editor no puede crear clientes vía API", "POST", "/clientes", {
      headers: [J, AUTH("token_editor")], body: clienteValido("editor{{sufijo}}"),
      tests: [status(403, "Responde 403 (RF-3.2 / RB-4: rol editor sin permiso de escritura)"), `if (pm.response.code === 201) pm.environment.set('cliente_editor_id', pm.response.json().id);`],
    }),
    req("[CP-08b] Editor no puede eliminar clientes vía API", "DELETE", "/clientes/{{cliente_editor_id}}", {
      headers: [AUTH("token_editor")], tests: [status(403, "Responde 403 (rol editor)")],
    }),
    req("[CP-07] Editor no puede crear usuarios con rol administrador", "POST", "/empresa-usuarios", {
      headers: [J, AUTH("token_editor")], pre: [`pm.environment.set('esc', 'qa_escalada_' + Date.now());`],
      body: { nombre_usuario: "{{esc}}", contrasena_hash: "Escalada#2026", correo: "{{esc}}@qa.test", rol_id: 1 },
      tests: [status(403, "Responde 403 (escalamiento de privilegios)")],
    }),
    req("[CP-13a] Empresa B no ve clientes de empresa A (control existente)", "GET", "/clientes/1", {
      headers: [AUTH("token_b")], tests: [denied("Responde 403/404 a recurso de otra empresa")],
    }),
    req("[CP-13b] Empresa B no puede leer contratos de empresa A", "GET", "/contratos/1", {
      headers: [AUTH("token_b")], tests: [denied("Responde 403/404 a recurso de otra empresa (RB-2)")],
    }),
    req("[CP-13c] Empresa B no puede descargar documentos de empresa A", "GET", "/contratos/{{contrato_id}}/file", {
      headers: [AUTH("token_b")], tests: [denied("Responde 403/404 a documento de otra empresa (RB-2)")],
    }),
    req("[CP-13d] Empresa B no puede leer datos de empresa A", "GET", "/empresas/1", {
      headers: [AUTH("token_b")], tests: [denied("Responde 403/404 a datos de otra empresa")],
    }),
    req("[CP-19] Auditoría de empresa B no expone eventos de empresa A", "GET", "/auditoria", {
      headers: [AUTH("token_b")],
      tests: [t("No contiene acciones de los usuarios admin/editor de la empresa A", `if (pm.response.code !== 200) { pm.expect(pm.response.code).to.be.oneOf([401,403]); return; } const a = pm.response.json(); const ajenos = a.filter(e => ['admin','editor'].includes(e.usuario_id)); pm.expect(ajenos.length, ajenos.length + ' eventos de otra empresa expuestos').to.eql(0);`)],
    }),
  ],
});

// ---------------------------------------------------------------- 04 Seguridad: configuración y datos
folders.push({
  name: "04 Seguridad - Configuración, errores y archivos (OWASP A04/A05)",
  item: [
    req("[CP-23a] Cabeceras de seguridad HTTP presentes", "GET", "/", {
      tests: [
        t("X-Content-Type-Options: nosniff", `pm.expect(pm.response.headers.get('X-Content-Type-Options')).to.eql('nosniff');`),
        t("Content-Security-Policy definida", `pm.expect(pm.response.headers.has('Content-Security-Policy')).to.be.true;`),
        t("Strict-Transport-Security definida (HSTS)", `pm.expect(pm.response.headers.has('Strict-Transport-Security')).to.be.true;`),
        t("No revela tecnología (sin X-Powered-By)", `pm.expect(pm.response.headers.has('X-Powered-By')).to.be.false;`),
      ],
    }),
    req("[CP-23b] CORS no acepta orígenes arbitrarios", "GET", "/", {
      headers: [{ key: "Origin", value: "https://sitio-atacante.example" }],
      tests: [t("Access-Control-Allow-Origin no es * ni el origen atacante", `const o = pm.response.headers.get('Access-Control-Allow-Origin'); pm.expect(o === '*' || o === 'https://sitio-atacante.example', 'ACAO = ' + o).to.be.false;`)],
    }),
    req("[CP-24] Errores no exponen detalles internos (SQL/stack)", "GET", "/clientes/abc", {
      headers: [AUTH("token_admin")],
      tests: [t("Respuesta sin mensajes del motor de base de datos", `pm.expect(pm.response.text()).to.not.match(/invalid input syntax|syntax error|postgres|pg_|at .*\\.js/i);`)],
    }),
    req("[CP-15] Carga de archivo no permitido (.exe) es rechazada", "POST", "/contratos", {
      headers: [AUTH("token_admin")],
      formdata: [{ key: "cliente_id", value: "{{cliente_id}}", type: "text" }, { key: "titulo", value: "Contrato con ejecutable", type: "text" },
        { key: "fecha_inicio", value: "2026-01-01", type: "text" }, { key: "fecha_fin", value: "2026-12-31", type: "text" },
        { key: "file", type: "file", src: "malicioso.exe" }],
      tests: [t("Responde 400/415 (RF-5.2: solo PDF, DOC, PPT, JPG, PNG)", `pm.expect(pm.response.code).to.be.oneOf([400, 415]);`)],
    }),
    req("[CP-24b] Documentación Swagger no expuesta públicamente en producción", "GET", "/docs/", {
      tests: [denied("/docs responde 401/403/404 con NODE_ENV=production")],
    }),
  ],
});

// ---------------------------------------------------------------- 05 Rendimiento
folders.push({
  name: "05 Rendimiento por petición (NFR-PERF-1 < 300 ms)",
  item: [
    req("[CP-27a] GET / (salud de la API)", "GET", "/", { tests: [status(200), fast(300)] }),
    req("[CP-27b] POST /autenticacion/login", "POST", "/autenticacion/login", { headers: [J], body: { nombre_usuario: "{{admin_user}}", password: "{{admin_pass}}" }, tests: [status(200), fast(300)] }),
    req("[CP-27c] GET /clientes", "GET", "/clientes", { headers: [AUTH("token_admin")], tests: [status(200), fast(300)] }),
    req("[CP-27d] GET /contratos", "GET", "/contratos", { headers: [AUTH("token_admin")], tests: [status(200), fast(300)] }),
    req("[CP-27e] GET /metricas", "GET", "/metricas", { headers: [AUTH("token_admin")], tests: [status(200), fast(300)] }),
    req("[CP-27f] GET /clientes/:id", "GET", "/clientes/{{cliente_id}}", { headers: [AUTH("token_admin")], tests: [status(200), fast(300)] }),
  ],
});

const collection = {
  info: {
    name: "Atlas EP5 - Pruebas automatizadas funcionales y de seguridad",
    description: "ISY1102 - Evaluación Parcial 5. Cada prueba verifica el comportamiento esperado según el ERS v1.1, OWASP Top 10:2021 y la Ley 19.628.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: folders,
};
fs.writeFileSync(path.join(__dirname, "atlas-ep5.postman_collection.json"), JSON.stringify(collection, null, 2));

const env = {
  name: "Atlas CI",
  values: [
    ["base_url", "http://localhost:4450"], ["admin_user", "admin"], ["admin_pass", "admin"], ["editor_user", "editor"], ["editor_pass", "editor"],
    ["jwt_secret_publico", "your-secret-key-change-in-production"], ["contrato_anon_id", "999999"], ["cliente_editor_id", "999999"],
  ].map(([key, value]) => ({ key, value, enabled: true })),
};
fs.writeFileSync(path.join(__dirname, "atlas-ci.postman_environment.json"), JSON.stringify(env, null, 2));
const n = folders.reduce((a, f) => a + f.item.length, 0);
console.log(`Colección generada: ${folders.length} carpetas, ${n} peticiones`);
