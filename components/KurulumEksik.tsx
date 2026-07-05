export default function KurulumEksik() {
  return (
    <main className="huzme flex min-h-dvh items-center justify-center p-6">
      <div className="bilet max-w-lg rounded-2xl bg-koltuk p-8">
        <h1 className="font-display text-2xl font-bold text-amber">
          Kurulum tamamlanmadı
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-soluk">
          Supabase bağlantı bilgileri bulunamadı. Uygulamanın çalışması için:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <a
              href="https://supabase.com"
              className="text-amber underline underline-offset-2"
            >
              supabase.com
            </a>
            &apos;da ücretsiz bir proje aç.
          </li>
          <li>
            SQL Editor&apos;da <code className="rounded bg-kadife px-1.5 py-0.5">supabase/schema.sql</code>{" "}
            dosyasını çalıştır.
          </li>
          <li>
            Proje kökünde <code className="rounded bg-kadife px-1.5 py-0.5">.env.local</code>{" "}
            oluşturup <code className="rounded bg-kadife px-1.5 py-0.5">.env.example</code>{" "}
            içindeki iki değeri doldur.
          </li>
          <li>Uygulamayı yeniden başlat.</li>
        </ol>
        <p className="mt-4 text-xs text-soluk">
          Ayrıntılı adımlar README.md ve PROJE_HAFIZA.md dosyalarında.
        </p>
      </div>
    </main>
  );
}
