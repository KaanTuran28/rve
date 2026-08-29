/** Ekran paylaşımı için P2P bağlantı yardımcıları. Sinyalleşme (teklif/yanıt/aday)
 * mevcut Supabase broadcast kanalı üzerinden gider — burada sadece bağlantının
 * kendisi kurulur. */

const ICE_SUNUCULARI: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function baglantiKur(
  onAday: (aday: RTCIceCandidate) => void,
  onTrack: (akis: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SUNUCULARI });
  pc.onicecandidate = (olay) => {
    if (olay.candidate) onAday(olay.candidate);
  };
  pc.ontrack = (olay) => onTrack(olay.streams[0]);
  return pc;
}
