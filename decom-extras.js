/* ===== DECOM extras: notificaciones que llevan al comentario, eliminar cuenta, legal, acceso admin ===== */
(function () {
  'use strict';
  var norm = function (x) { return String(x || '').trim().toLowerCase(); };
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
    var autor = norm(n.de_correo), t = norm(n.texto).slice(0, 60);
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
    if (['comentario', 'respuesta', 'mencion'].indexOf(n.tipo) < 0) return; /* "like": basta con la publicación */
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

  /* ---------- 3) Botones en el menú de usuario ---------- */
  function boton(id, icono, texto, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.id = id; b.className = 'menu-btn';
    b.innerHTML = '<i class="' + icono + '" aria-hidden="true"></i><span></span>';
    b.querySelector('span').textContent = texto;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      try { document.getElementById('userMenu').style.display = 'none'; } catch (_) {}
      fn();
    });
    return b;
  }
  function armarMenu() {
    var menu = document.getElementById('userMenu');
    if (!menu || !yo() || !sb() || document.getElementById('fpLegalMenu')) return false;
    menu.appendChild(boton('fpLegalMenu', 'fas fa-file-contract', 'Términos y privacidad', function () { window.open('legal.html', '_blank'); }));
    menu.appendChild(boton('fpEliminarCuenta', 'fas fa-user-xmark', 'Eliminar cuenta', eliminarCuenta));
    Promise.resolve(sb().rpc('es_admin')).then(function (r) {
      if (r && r.data === true && !document.getElementById('fpAdminMenu'))
        menu.appendChild(boton('fpAdminMenu', 'fas fa-shield-halved', 'Panel de administrador', function () { window.open('admin.html', '_blank'); }));
    }).catch(function () {});
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

  var intentos = 0, t = setInterval(function () {
    intentos++;
    avisoRegistro();
    if (armarMenu() || intentos > 240) clearInterval(t);
  }, 1000);
})();
