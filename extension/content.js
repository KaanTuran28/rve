// Rve Senkron — content script. Her web sayfasında ve her frame'de çalışır.
// Sayfadaki HTML5 <video> öğesini dinler ve uzaktan gelen komutları uygular.
// WebSocket burada YOK; ağ işi service worker'da (sitelerin CSP'sinden kaçınmak için).

(() => {
  // Çifte enjeksiyon koruması: onInstalled enjeksiyonu + manifest aynı frame'e
  // iki kez yüklerse dinleyiciler ikilenmesin
  if (window.__rveContentYuklendi) return;
  window.__rveContentYuklendi = true;

  // Rve sitesinin kendi YouTube gömme frame'ine karışma: site zaten IFrame API
  // ile senkronluyor, eklenti de uygularsa komutlar çifte biner.
  if (
    location.hostname === "www.youtube.com" &&
    location.pathname.startsWith("/embed")
  ) {
    return;
  }

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
    // "Tüm sekmeler" modunda alakasız kısa videolara dokunmamak için içerik filtresi
    if (!v || !icerikMi(v)) return;
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
    } else if (msg.tip === "rveMesaj") {
      // Sohbet mesajı: bu frame tam ekrandaysa video üstünde kaydır
      if (fsKat && msg.mesaj) kayanEkle(msg.mesaj.nickname, msg.mesaj.content);
      yanit && yanit({ ok: true });
    }
    return true;
  });

  // ---------- Tam ekran sohbet: 💬 baloncuk + kayan mesajlar ----------
  // Sitenin KENDİ tam ekranında Rve sayfası tıklanabilir katman koyamaz
  // (Chromium top-layer'a boyamayı verip hit-test'i vermiyor) — ama biz
  // sayfanın İÇİNDEyiz: katman fullscreenElement'in alt ağacına eklenince
  // gerçek tıklama alır. Yalnız eklenti bir odaya bağlıyken kurulur.
  // Rve'nin kendi sayfalarında kurulmaz (site kendi baloncuğunu basıyor).
  const rveSayfasiMi = () =>
    !!document.querySelector('meta[name="application-name"][content="Rve"]');

  let fsKat = null; // katman kabı (tam ekran öğesinin içinde ya da popover)
  let fsPopover = false; // <video> tam ekranıysa popover fallback (yalnız görsel)
  let seritSira = 0;
  const KONUM_ANAHTARI = "__rveBalonKonum";

  const STIL_ID = "__rveFsStil";
  function stilEkle() {
    if (document.getElementById(STIL_ID)) return;
    const s = document.createElement("style");
    s.id = STIL_ID;
    s.textContent = [
      "@keyframes rveKayan{from{transform:translateX(0)}to{transform:translateX(calc(-100vw - 100%))}}",
      ".rve-kayan{position:absolute;left:100vw;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis;",
      "background:rgba(13,11,16,.72);color:#f2ede4;border-radius:999px;padding:6px 14px;",
      "font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4);",
      "animation:rveKayan 9s linear forwards;pointer-events:none;will-change:transform}",
      ".rve-kayan b{color:#f6c453;font-weight:600;margin-right:8px}",
      "@media (prefers-reduced-motion: reduce){.rve-kayan{display:none}}",
    ].join("");
    document.head.appendChild(s);
  }

  function kayanEkle(kim, metin) {
    if (!fsKat) return;
    const k = document.createElement("div");
    k.className = "rve-kayan";
    k.style.top = `${7 + (seritSira++ % 5) * 9}%`;
    const b = document.createElement("b");
    b.textContent = kim || "";
    k.appendChild(b);
    k.appendChild(
      document.createTextNode(String(metin || "").slice(0, 90))
    );
    k.addEventListener("animationend", () => k.remove());
    fsKat.appendChild(k);
    // Eski tarayıcıda animationend gelmezse birikmesin
    while (fsKat.querySelectorAll(".rve-kayan").length > 15) {
      fsKat.querySelector(".rve-kayan").remove();
    }
  }

  // Rve sayfasına haber ver (iframe içindeysek üst pencere Rve'dir): eklenti
  // katmanı kuruluyken site kendi popover danmaku'sunu basmasın (çifte yazı)
  function ustuBilgilendir(acik) {
    try {
      if (window.top !== window) {
        window.top.postMessage({ __rve: "fsSohbet", acik }, "*");
      }
    } catch {
      /* cross-origin postMessage her zaman serbest; yine de tedbir */
    }
  }

  function konumOku() {
    try {
      const ham = localStorage.getItem(KONUM_ANAHTARI);
      return ham ? JSON.parse(ham) : null;
    } catch {
      return null;
    }
  }

  function fsKur(fs) {
    fsSok();
    stilEkle();
    if (fs.tagName === "VIDEO" || fs.tagName === "IFRAME") {
      // İçine öğe koyulamayan tam ekran: iframe'i içindeki frame'in kendi
      // content script'i halleder; çıplak <video> içinse yalnız görsel
      // popover katmanı kurulabilir (baloncuk tıklanamazdı, koymuyoruz)
      if (fs.tagName === "IFRAME") return;
      const kat = document.createElement("div");
      kat.setAttribute("popover", "manual");
      kat.style.cssText =
        "position:fixed;inset:0;margin:0;padding:0;border:0;width:100%;height:100%;background:transparent;overflow:hidden;pointer-events:none";
      document.body.appendChild(kat);
      try {
        kat.showPopover();
      } catch {
        /* popover yoksa kayanlar videonun altında kalır */
      }
      fsKat = kat;
      fsPopover = true;
      ustuBilgilendir(true);
      return;
    }
    const kat = document.createElement("div");
    kat.style.cssText =
      "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483647";
    fs.appendChild(kat);
    fsKat = kat;
    fsPopover = false;
    balonKur(kat);
    ustuBilgilendir(true);
  }

  function fsSok() {
    if (!fsKat) return;
    if (fsPopover) {
      try {
        fsKat.hidePopover();
      } catch {
        /* zaten kapalı */
      }
    }
    fsKat.remove();
    fsKat = null;
    fsPopover = false;
    ustuBilgilendir(false);
  }

  // Sürüklenebilir 💬 baloncuğu + dokununca açılan mini yazma kutusu.
  // Aynı belgede olduğumuz için setPointerCapture yeterli (Rve sayfasındaki
  // cross-origin iframe kalkan sorunu burada yok).
  function balonKur(kat) {
    const balon = document.createElement("button");
    balon.textContent = "💬";
    balon.title = "Mesaj yaz (basılı tutup sürükleyerek taşı)";
    balon.style.cssText =
      "position:absolute;width:48px;height:48px;border-radius:999px;border:0;" +
      "background:#f6c453;font-size:20px;line-height:1;cursor:pointer;" +
      "box-shadow:0 6px 20px rgba(0,0,0,.45);pointer-events:auto;touch-action:none;" +
      "display:flex;align-items:center;justify-content:center;z-index:2";
    const konum = konumOku();
    if (konum) {
      balon.style.left = `${konum.x}px`;
      balon.style.top = `${konum.y}px`;
    } else {
      balon.style.right = "16px";
      balon.style.bottom = "72px";
    }
    kat.appendChild(balon);

    let kutu = null;
    let surukle = null;
    let acilis = 0;

    function sinirla(x, y) {
      return {
        x: Math.min(Math.max(x, 4), Math.max(4, innerWidth - 52)),
        y: Math.min(Math.max(y, 4), Math.max(4, innerHeight - 52)),
      };
    }

    balon.addEventListener("pointerdown", (e) => {
      e.preventDefault(); // dokunuşun hayalet click'ini bastır
      balon.setPointerCapture(e.pointerId);
      const r = balon.getBoundingClientRect();
      surukle = { px: e.clientX, py: e.clientY, bx: r.left, by: r.top, tasindi: false };
    });
    balon.addEventListener("pointermove", (e) => {
      if (!surukle) return;
      const dx = e.clientX - surukle.px;
      const dy = e.clientY - surukle.py;
      if (!surukle.tasindi && Math.hypot(dx, dy) < 8) return;
      surukle.tasindi = true;
      const k = sinirla(surukle.bx + dx, surukle.by + dy);
      balon.style.right = balon.style.bottom = "auto";
      balon.style.left = `${k.x}px`;
      balon.style.top = `${k.y}px`;
    });
    balon.addEventListener("pointerup", () => {
      if (!surukle) return;
      const tasindi = surukle.tasindi;
      surukle = null;
      if (tasindi) {
        const r = balon.getBoundingClientRect();
        try {
          localStorage.setItem(
            KONUM_ANAHTARI,
            JSON.stringify({ x: r.left, y: r.top })
          );
        } catch {
          /* localStorage kapalı — konum bu oturumda kalır */
        }
      } else {
        acilis = Date.now();
        kutuAc();
      }
    });
    balon.addEventListener("pointercancel", () => {
      surukle = null;
    });

    function kutuAc() {
      if (kutu) {
        kutu.querySelector("input").focus();
        return;
      }
      kutu = document.createElement("div");
      const r = balon.getBoundingClientRect();
      const genislik = Math.min(320, innerWidth - 24);
      kutu.style.cssText =
        "position:absolute;display:flex;gap:6px;align-items:center;" +
        "background:rgba(23,20,28,.95);border-radius:999px;padding:6px;" +
        "box-shadow:0 8px 30px rgba(0,0,0,.5);pointer-events:auto;z-index:3;" +
        `width:${genislik}px;left:${Math.min(Math.max(r.left, 12), innerWidth - genislik - 12)}px;` +
        `top:${Math.min(Math.max(r.top - 60, 12), innerHeight - 70)}px`;
      const giris = document.createElement("input");
      giris.placeholder = "Mesaj yaz…";
      giris.maxLength = 500;
      giris.style.cssText =
        "flex:1;min-width:0;border:1px solid #3a3344;border-radius:999px;" +
        "background:#0d0b10;color:#f2ede4;padding:8px 14px;font:14px system-ui,sans-serif;outline:none";
      const gonderB = document.createElement("button");
      gonderB.textContent = "➤";
      gonderB.title = "Gönder";
      gonderB.style.cssText =
        "width:36px;height:36px;border-radius:999px;border:0;background:#f6c453;" +
        "font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0";
      const kapatB = document.createElement("button");
      kapatB.textContent = "✕";
      kapatB.title = "Kapat";
      kapatB.style.cssText =
        "width:36px;height:36px;border-radius:999px;border:1px solid #3a3344;" +
        "background:transparent;color:#a99f95;font-size:14px;cursor:pointer;flex-shrink:0";
      function gonder() {
        if (Date.now() - acilis < 350) return; // hayalet tıklama
        const t = giris.value.trim();
        if (!t) return;
        giris.value = "";
        chrome.runtime
          .sendMessage({ tip: "rveMesajGonder", metin: t })
          .catch(() => {});
      }
      function kutuKapat() {
        if (Date.now() - acilis < 350) return; // hayalet tıklama
        kutu.remove();
        kutu = null;
      }
      giris.addEventListener("keydown", (e) => {
        e.stopPropagation(); // sitenin kısayolları (boşluk=duraklat vb.) yutmasın
        if (e.key === "Enter") gonder();
        if (e.key === "Escape") kutuKapat();
      });
      gonderB.addEventListener("click", gonder);
      kapatB.addEventListener("click", kutuKapat);
      kutu.append(giris, gonderB, kapatB);
      kat.appendChild(kutu);
      giris.focus();
    }
  }

  document.addEventListener("fullscreenchange", () => {
    const fs = document.fullscreenElement;
    if (!fs || rveSayfasiMi()) {
      fsSok();
      return;
    }
    // Yalnız odaya bağlıyken kur (mesaj kanalı yoksa katmanın anlamı yok)
    chrome.runtime
      .sendMessage({ tip: "rveDurumSor" })
      .then((d) => {
        if (d && d.bagli && document.fullscreenElement === fs) fsKur(fs);
      })
      .catch(() => {});
  });

  // Sayfa → eklenti köprüsü: Rve sitesi buradan konuşur.
  //   ping   → pong (site "eklenti kurulu mu" diye yoklar)
  //   baglan → service worker odaya bağlanır, siteye bagliOk döner
  //   kapat  → bağlantı kapatılır
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data) return;
    const d = e.data;
    if (d.__rve === "ping") {
      window.postMessage({ __rve: "pong" }, "*");
    } else if (d.__rve === "baglan" && typeof d.kod === "string") {
      const kod = d.kod.toUpperCase();
      const ad = typeof d.ad === "string" ? d.ad : undefined;
      chrome.runtime
        .sendMessage({ tip: "rveBaglan", kod, hepsi: true, ad })
        .then(() => window.postMessage({ __rve: "bagliOk", kod }, "*"))
        .catch(() => {});
    } else if (d.__rve === "kapat") {
      chrome.runtime.sendMessage({ tip: "rveKapat" }).catch(() => {});
    }
  });

  // Sayfa açılınca service worker'ı uyandır (varsa önceki bağlantı canlanır)
  chrome.runtime.sendMessage({ tip: "rvePing" }).catch(() => {});

  // Rve sitesi dinliyorsa varlığımızı duyur (ping beklemeden buton çıkar)
  if (window === window.top) {
    window.postMessage({ __rve: "pong" }, "*");
  }

  // Video geç yüklenebilir / öğe değişebilir → periyodik yeniden bağla
  setInterval(hookla, 1500);
  hookla();
})();
