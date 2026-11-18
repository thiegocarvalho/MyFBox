// Escolhe o manifest do PWA e o lang inicial pelo idioma salvo ou do navegador.
// Fica em arquivo (e não inline no index.html) para respeitar a CSP (script-src 'self').
(function () {
  try {
    var stored = '';
    try {
      stored = window.localStorage.getItem('myfbox_language') || '';
    } catch {
      stored = '';
    }
    var raw = (stored || navigator.language || 'pt-BR').toLowerCase().replace(/_/g, '-');
    var lang = 'pt-BR';
    var manifest = './manifest.pt.webmanifest';
    if (raw.indexOf('en') === 0) {
      lang = 'en-GB';
      manifest = './manifest.en.webmanifest';
    } else if (raw.indexOf('es') === 0) {
      lang = 'es';
      manifest = './manifest.es.webmanifest';
    } else if (raw.indexOf('zh') === 0) {
      lang = 'zh-CN';
      manifest = './manifest.zh.webmanifest';
    }
    if (document.documentElement) {
      document.documentElement.lang = lang;
    }
    var link = document.getElementById('manifest-link');
    if (link) link.href = manifest;
  } catch {
    /* mantém o manifest padrão */
  }
})();
