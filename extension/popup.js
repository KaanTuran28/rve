// Rve Netflix Senkron — popup.
const durumEl = document.getElementById("durum");
const kodEl = document.getElementById("kod");

function durumGoster(bagli, kod) {
  durumEl.textContent = bagli ? `Bağlı: oda ${kod}` : "Bağlı değil";
  durumEl.className = bagli ? "bagli" : "";
}

async function aktifTab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

document.getElementById("baglan").addEventListener("click", async () => {
  const kod = kodEl.value.trim().toUpperCase();
  if (!kod) {
    durumEl.textContent = "Önce oda kodunu gir";
    return;
  }
  const t = await aktifTab();
  if (!t || !t.url || !/^https?:/i.test(t.url)) {
    durumEl.textContent = "Önce bir video sitesi sekmesi aç";
    return;
  }
  chrome.storage.local.set({ sonKod: kod });
  chrome.runtime.sendMessage({ tip: "rveBaglan", kod, tabId: t.id }, () => {});
  durumEl.textContent = "Bağlanıyor…";
});

document.getElementById("kapat").addEventListener("click", () => {
  chrome.runtime.sendMessage({ tip: "rveKapat" }, () => {});
});

kodEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("baglan").click();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.tip === "rveDurum") durumGoster(msg.bagli, msg.kod);
});

(async () => {
  chrome.runtime.sendMessage({ tip: "rveDurumSor" }, (r) => {
    if (r) durumGoster(r.bagli, r.kod);
  });
  const { sonKod } = await chrome.storage.local.get("sonKod");
  if (sonKod) kodEl.value = sonKod;
})();
