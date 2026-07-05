// Rve Senkron — content script. Her web sayfasında ve her frame'de çalışır.
// Sayfadaki HTML5 <video> öğesini dinler ve uzaktan gelen komutları uygular.
// WebSocket burada YOK; ağ işi service worker'da (sitelerin CSP'sinden kaçınmak için).

(() => {
  let uzaktanKadar = 0; // bu zamana kadar yerel olayları yayınlama (yankı önleme)
  const uzak = (ms = 1400) => {
    uzaktanKadar = Date.now() + ms;
  };
  const uzakMi = () => Date.now() < uzaktanKadar;
  const yakin = (a, b) => Math.abs(a - b) < 1.5;

  // Sayfadaki en büyük alanlı videoyu "ana içerik" say (reklam/önizlemeleri ele)
  function anaVideo() {
    const hepsi = Array.from(document.querySelectorAll("video"));
    let en = null;
    let enAlan = -1;
    for (const v of hepsi) {
      const r = v.getBoundingClientRect();
      const alan = r.width * r.height;
      if (alan > enAlan) {
        enAlan = alan;
        en = v;
      }
    }
    return en;
  }

  // Kısa reklamları ayıkla: film/dizi uzun ya da canlı yayın (süresi sonsuz) olur
  function icerikMi(v) {
    return v && (!isFinite(v.duration) || v.duration > 30);
  }

  function yerel(olay) {
    chrome.runtime.sendMessage({ tip: "rveYerel", olay }).catch(() => {});
  }

  function hookla() {
    const v = anaVideo();
    if (!v || v.__rveBagli) return;
    v.__rveBagli = true;
    v.addEventListener("play", () => {
      if (!uzakMi() && icerikMi(v)) yerel({ tur: "oynat", saniye: v.currentTime });
    });
    v.addEventListener("pause", () => {
      if (!uzakMi() && icerikMi(v))
        yerel({ tur: "duraklat", saniye: v.currentTime });
    });
    v.addEventListener("seeked", () => {
      if (!uzakMi() && icerikMi(v)) yerel({ tur: "sar", saniye: v.currentTime });
    });
  }

  function uygula(olay) {
    const v = anaVideo();
    if (!v) return;
    if (olay.tur === "oynat") {
      uzak();
      if (!yakin(v.currentTime, olay.saniye)) v.currentTime = olay.saniye;
      v.play().catch(() => {});
    } else if (olay.tur === "duraklat") {
      uzak();
      v.pause();
      if (!yakin(v.currentTime, olay.saniye)) v.currentTime = olay.saniye;
    } else if (olay.tur === "sar") {
      uzak();
      v.currentTime = olay.saniye;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _s, yanit) => {
    if (msg.tip === "rveUygula") {
      uygula(msg.olay);
      yanit && yanit({ ok: true });
    }
    return true;
  });

  // Video geç yüklenebilir / öğe değişebilir → periyodik yeniden bağla
  setInterval(hookla, 1500);
  hookla();
})();
