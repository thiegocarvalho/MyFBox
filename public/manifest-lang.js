// Escolhe o manifest do PWA pelo idioma do navegador. Fica em arquivo (e não inline no
// index.html) para respeitar a Content Security Policy do build (script-src 'self').
(function () {
  try {
    var lang = (navigator.language || 'pt').toLowerCase();
    var link = document.getElementById('manifest-link');
    if (link) link.href = lang.indexOf('en') === 0 ? '/manifest.en.webmanifest' : '/manifest.pt.webmanifest';
  } catch {
    /* mantém o manifest padrão */
  }
})();
