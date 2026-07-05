// Rve Netflix Senkron — service worker.
// Supabase Realtime kanalına ham Phoenix (WebSocket) protokolüyle bağlanır.
// WebSocket'i service worker sahiplenir: Netflix'in CSP'sinden etkilenmez ve
// heartbeat sayesinde worker uyutulmadan bağlantı canlı kalır.

const SUPABASE_URL = "https://jjdgfhqsbsfygyfopfxd.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZGdmaHFzYnNmeWd5Zm9wZnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzIyMDgsImV4cCI6MjA5ODg0ODIwOH0.Ul-I_-qVURRTTG2W8K4uv5WolA4WjlK-LJj78j6HByc";

let ws = null;
let kod = null;
let tabId = null;
let aktif = false;
let refSayac = 1;
let hb = null;

const topic = () => `realtime:oda:${kod}`;

function join() {
  ws.send(
    JSON.stringify({
      topic: topic(),
      event: "phx_join",
      payload: {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: "" },
          private: false,
        },
        access_token: ANON,
      },
      ref: String(refSayac++),
      join_ref: "1",
    })
  );
}

function kalpAtisi() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        topic: "phoenix",
        event: "heartbeat",
        payload: {},
        ref: String(refSayac++),
      })
    );
  }
}

function yayinla(olay) {
  if (ws && ws.readyState === WebSocket.OPEN && kod) {
    ws.send(
      JSON.stringify({
        topic: topic(),
        event: "broadcast",
        payload: { type: "broadcast", event: "senkron", payload: olay },
        ref: String(refSayac++),
      })
    );
  }
}

function durdurHb() {
  if (hb) {
    clearInterval(hb);
    hb = null;
  }
}

function bildir() {
  chrome.runtime
    .sendMessage({
      tip: "rveDurum",
      bagli: !!(ws && ws.readyState === WebSocket.OPEN),
      kod,
    })
    .catch(() => {});
}

function baglan(yeniKod, yeniTab) {
  kapat(false);
  kod = yeniKod;
  tabId = yeniTab;
  aktif = true;
  chrome.storage.local.set({ kod, tabId, aktif });

  ws = new WebSocket(
    `${SUPABASE_URL}/realtime/v1/websocket?apikey=${ANON}&vsn=1.0.0`
  );

  ws.onopen = () => {
    join();
    durdurHb();
    hb = setInterval(kalpAtisi, 25000);
    bildir();
  };

  ws.onmessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    if (m.event === "broadcast" && m.payload && m.payload.event === "senkron") {
      if (tabId != null) {
        chrome.tabs
          .sendMessage(tabId, { tip: "rveUygula", olay: m.payload.payload })
          .catch(() => {});
      }
    }
  };

  ws.onclose = () => {
    durdurHb();
    ws = null;
    bildir();
    // Bağlantı beklenmedik koptuysa yeniden dene
    if (aktif) setTimeout(() => aktif && baglan(kod, tabId), 2000);
  };

  ws.onerror = () => {};
}

function kapat(kalici = true) {
  aktif = false;
  durdurHb();
  if (ws) {
    try {
      ws.close();
    } catch {}
    ws = null;
  }
  if (kalici) chrome.storage.local.set({ aktif: false });
  bildir();
}

chrome.runtime.onMessage.addListener((msg, sender, yanit) => {
  if (msg.tip === "rveBaglan") {
    // Popup tabId verir; content script köprüsünden gelince gönderenin sekmesi
    const hedefTab = msg.tabId != null ? msg.tabId : sender.tab && sender.tab.id;
    baglan(msg.kod, hedefTab);
    yanit({ ok: true });
  } else if (msg.tip === "rveKapat") {
    kapat(true);
    yanit({ ok: true });
  } else if (msg.tip === "rveDurumSor") {
    yanit({ bagli: !!(ws && ws.readyState === WebSocket.OPEN), kod });
  } else if (msg.tip === "rveYerel") {
    yayinla(msg.olay);
    yanit({ ok: true });
  } else if (msg.tip === "rvePing") {
    yanit({ ok: true });
  }
  return true; // asenkron yanıt için kanalı açık tut
});

// Service worker yeniden başlarsa önceki bağlantıyı geri kur
chrome.storage.local.get(["kod", "tabId", "aktif"]).then((s) => {
  if (s.aktif && s.kod) baglan(s.kod, s.tabId);
});
