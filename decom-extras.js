/* ===== DECOM extras v3: notificaciones->comentario, eliminar cuenta, legal, admin, autocompletar @ ===== */
(function () {
  'use strict';
  console.log('[DECOM] extras cargado v3');
  var norm = function (x) { return String(x || '').trim().toLowerCase(); };
  var sinTildes = function (x) { return norm(x).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  function yo() { try { return norm(currentAuthorEmail); } catch (e) { return ''; } }
  function sb() { try { return supabaseClient; } catch (e) { return null; } }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function toast(t) {
    var e = document.getElementById('fpToast');
    if (!e) { e = document.createElement('div'); e.id = 'fpToast'; document.body.appendChild(e); }
    e.textContent = t; e.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('show'); }, 2800);
  }

  /* ---------- 1) Tocar una notificación: ir a la publicación y al comentario exacto ---------- */
  function buscarComentario(n) {
    var lis = [].slice.call(document.querySelectorAll('#commentsList li[data-id]'));
    if (n.comentario_id) {
      var directo = lis.filter(function (l) { return String(l.dataset.id) === String(n.comentario_id); })[0];
      if (directo) return directo;
    }
    var autor = n.tipo === 'like_comentario' ? yo() : norm(n.de_correo), t = norm(n.texto).slice(0, 60);
    var propios = lis.filter(function (l) { return norm(l.dataset.correo) === autor; });
    if (t) {
      var igual = propios.filter(function (l) {
        var x = norm(l.dataset.texto).slice(0, 60);
        return x && (x.indexOf(t) === 0 || t.indexOf(x) === 0);
      });
      if (igual.length) return igual[0];
    }
    return propios[0] || null;
  }
  function resaltar(li) {
    li.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var viejo = li.style.cssText;
    li.style.transition = 'background .4s';
    li.style.background = 'rgba(59,130,246,.35)';
    setTimeout(function () { li.style.background = ''; setTimeout(function () { li.style.cssText = viejo; }, 500); }, 2200);
  }
  window.fpAbrirNotificacion = async function (n) {
    var ok = await irAAnuncioNotificado(n.publicacion_id);
    if (!ok) return;
    if (['comentario', 'respuesta', 'mencion', 'like_comentario'].indexOf(n.tipo) < 0) return;
    await esperar(750);
    var c = document.getElementById('commentsCounter');
    if (c) c.click();
    var li = null;
    for (var i = 0; i < 16 && !li; i++) { await esperar(250); li = buscarComentario(n); }
    if (li) resaltar(li); else toast('No se encontró ese comentario (puede haberse borrado)');
  };

  /* ---------- 2) Eliminar cuenta ---------- */
  async function eliminarCuenta() {
    var conf = window.fpConfirmarAccion || function (t, m) { return Promise.resolve(confirm(t + '\n\n' + m)); };
    var ok = await conf('Eliminar mi cuenta', 'Se borrarán tu perfil, tus publicaciones, comentarios, seguidores y tu acceso. Esta acción no se puede deshacer.', 'Continuar', true);
    if (!ok) return;
    var t = prompt('Para confirmar, escribe ELIMINAR (en mayúsculas):');
    if (t === null || t.trim() !== 'ELIMINAR') { toast('Cancelado'); return; }
    var r = await sb().rpc('eliminar_mi_cuenta');
    if (r.error) { console.error('eliminar_mi_cuenta', r.error); toast('No se pudo eliminar la cuenta. Intenta de nuevo'); return; }
    try { await sb().auth.signOut(); } catch (e) {}
    try { localStorage.clear(); } catch (e) {}
    alert('Tu cuenta fue eliminada.');
    location.reload();
  }

  /* ---------- 3) Botones en el menú de usuario (dentro del panel, antes del pie de versión) ---------- */
  function boton(id, icono, texto, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.id = id; b.className = 'menu-btn';
    b.innerHTML = '<i class="' + icono + '" aria-hidden="true"></i><span></span>';
    b.querySelector('span').textContent = texto;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      try { document.getElementById('userMenu').style.display = 'none'; } catch (_) {}
      try { document.getElementById('userOverlay').style.display = 'none'; } catch (_) {}
      fn();
    });
    return b;
  }
  function panelDe(menu) { return menu.firstElementChild || menu; }
  function insertar(menu, btn) {
    var panel = panelDe(menu), pie = panel.lastElementChild;
    if (pie && pie !== btn && /©|DECOM/.test(pie.textContent || '') && !pie.querySelector('button')) panel.insertBefore(btn, pie);
    else panel.appendChild(btn);
  }
  var adminOk = false, adminIntentos = 0, adminCorriendo = false;
  async function verificarAdmin(menu) {
    if (adminOk || adminCorriendo || document.getElementById('fpAdminMenu')) return;
    adminCorriendo = true;
    for (; adminIntentos < 8; adminIntentos++) {
      try {
        var r = await sb().rpc('es_admin');
        if (r.error) { console.warn('[DECOM] es_admin error:', r.error.message); }
        else if (r.data === true) {
          adminOk = true;
          console.log('[DECOM] es_admin = true para', yo());
          insertar(menu, boton('fpAdminMenu', 'fas fa-shield-halved', 'Panel de administrador', function () { window.open('admin.html', '_blank'); }));
          adminCorriendo = false; return;
        } else { console.info('[DECOM] es_admin = false para', yo()); }
      } catch (e) { console.warn('[DECOM] es_admin falló', e); }
      await esperar(3000);
    }
    adminCorriendo = false;
  }
  var authEscuchando = false;
  function armarMenu() {
    var menu = document.getElementById('userMenu');
    if (!menu || !yo() || !sb()) return false;
    if (!document.getElementById('fpLegalMenu')) {
      insertar(menu, boton('fpLegalMenu', 'fas fa-file-contract', 'Términos y privacidad', function () { window.open('legal.html', '_blank'); }));
      insertar(menu, boton('fpEliminarCuenta', 'fas fa-user-xmark', 'Eliminar cuenta', eliminarCuenta));
    }
    verificarAdmin(menu);
    if (!authEscuchando) {
      authEscuchando = true;
      try { sb().auth.onAuthStateChange(function () { verificarAdmin(menu); }); } catch (e) {}
    }
    return true;
  }

  /* ---------- 4) Aviso legal en el registro ---------- */
  function avisoRegistro() {
    var b = document.getElementById('btnRegistro');
    if (!b || document.getElementById('fpAvisoLegal')) return !!b;
    var p = document.createElement('p');
    p.id = 'fpAvisoLegal';
    p.style.cssText = 'font-size:12px;color:#777;text-align:center;margin:10px 0 0;line-height:1.4';
    p.innerHTML = 'Al crear tu cuenta aceptas los <a href="legal.html#terminos" target="_blank">Términos</a> y la <a href="legal.html#privacidad" target="_blank">Política de privacidad</a>.';
    b.parentNode.insertBefore(p, b);
    return true;
  }

  /* ---------- 5) Autocompletar menciones: @letras -> sugerencias ---------- */
  var usuarios = null, usuariosT = 0, cargando = null;
  async function cargarUsuarios() {
    if (usuarios && Date.now() - usuariosT < 60000) return usuarios;
    if (cargando) return cargando;
    cargando = (async function () {
      try {
        var r = await sb().from('usuarios').select('correo,nombre,foto_perfil').limit(500);
        if (r.error) throw r.error;
        usuarios = (r.data || []).filter(function (u) { return u.nombre && norm(u.correo) !== yo(); });
        usuariosT = Date.now();
      } catch (e) { console.warn('[DECOM] no se pudo leer usuarios para @:', e && e.message); usuarios = usuarios || []; }
      cargando = null; return usuarios;
    })();
    return cargando;
  }
  var caja = null, activo = null;
  function cajaSug() {
    if (caja) return caja;
    caja = document.createElement('div');
    caja.id = 'fpMencionBox';
    caja.style.cssText = 'position:fixed;z-index:100000;display:none;background:#1f2937;color:#f3f4f6;border:1px solid #374151;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.45);overflow:hidden;font:14px system-ui,sans-serif;max-height:290px;overflow-y:auto';
    document.body.appendChild(caja);
    return caja;
  }
  function ocultar() { if (caja) caja.style.display = 'none'; }
  function tokenActual(inp) {
    var pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
    var antes = inp.value.slice(0, pos), i = antes.lastIndexOf('@');
    if (i < 0) return null;
    if (i > 0 && !/\s/.test(antes[i - 1])) return null;
    var q = antes.slice(i + 1);
    if (/[:@\n]/.test(q) || q.length > 30) return null;
    return { ini: i, fin: pos, q: q };
  }
  async function sugerir(inp) {
    var tk = tokenActual(inp);
    if (!tk) { ocultar(); return; }
    var lista = await cargarUsuarios(), q = sinTildes(tk.q);
    var res = lista.filter(function (u) { return !q || sinTildes(u.nombre).indexOf(q) >= 0; })
      .sort(function (a, b) {
        var pa = sinTildes(a.nombre).indexOf(q) === 0 ? 0 : 1, pb = sinTildes(b.nombre).indexOf(q) === 0 ? 0 : 1;
        return pa - pb || String(a.nombre).localeCompare(b.nombre);
      }).slice(0, 6);
    var c = cajaSug();
    if (!res.length) { ocultar(); return; }
    c.textContent = '';
    res.forEach(function (u) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer';
      var im = document.createElement('img');
      im.style.cssText = 'width:30px;height:30px;border-radius:50%;object-fit:cover;background:#4b5563;flex:none';
      im.alt = ''; if (u.foto_perfil) im.src = u.foto_perfil;
      var sp = document.createElement('span'); sp.textContent = u.nombre;
      row.appendChild(im); row.appendChild(sp);
      var elegir = function (e) {
        e.preventDefault(); e.stopPropagation();
        var t2 = tokenActual(inp) || tk, ins = '@' + u.nombre + ': ';
        inp.value = inp.value.slice(0, t2.ini) + ins + inp.value.slice(t2.fin);
        var np = t2.ini + ins.length;
        try { inp.setSelectionRange(np, np); } catch (x) {}
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.focus(); ocultar();
      };
      row.addEventListener('mousedown', elegir);
      row.addEventListener('touchstart', elegir, { passive: false });
      c.appendChild(row);
    });
    var r = inp.getBoundingClientRect(), h = Math.min(290, res.length * 49 + 2);
    c.style.display = 'block';
    c.style.width = Math.max(220, Math.min(r.width, 360)) + 'px';
    c.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 368)) + 'px';
    c.style.top = Math.max(8, r.top - h - 6) + 'px';
    activo = inp;
  }
  function enlazarInput(inp) {
    if (!inp || inp.dataset.fpMencion) return;
    inp.dataset.fpMencion = '1';
    inp.addEventListener('input', function () { sugerir(inp); });
    inp.addEventListener('click', function () { sugerir(inp); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') ocultar(); });
    inp.addEventListener('blur', function () { setTimeout(ocultar, 200); });
  }
  function armarMenciones() {
    ['commentInput', 'feedCommentInput'].forEach(function (id) { enlazarInput(document.getElementById(id)); });
  }
  document.addEventListener('scroll', function () { if (activo) ocultar(); }, true);

  var intentos = 0, t = setInterval(function () {
    intentos++;
    avisoRegistro();
    armarMenciones();
    if (armarMenu() && intentos > 20) clearInterval(t);
    if (intentos > 600) clearInterval(t);
  }, 1000);
})();
