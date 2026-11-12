// absolute — likes, dislikes e comentários (Firebase Firestore)
// 1) Cole abaixo a configuração do seu projeto Firebase.
// 2) Suba este arquivo para o GitHub na mesma pasta do index.html.

const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

// O Firebase é carregado à parte: se falhar, o bloco de curtir/comentar aparece do mesmo jeito.
const BASE = "https://www.gstatic.com/firebasejs/10.12.2/";
let fb = null, db = null;
if (!String(firebaseConfig.apiKey).startsWith("COLE")) {
  try {
    const app = await import(BASE + "firebase-app.js");
    fb = await import(BASE + "firebase-firestore.js");
    db = fb.getFirestore(app.initializeApp(firebaseConfig));
  } catch (e) { console.error("Firebase não carregou:", e); }
}
const ativo = !!db;
const AVISO = "Curtidas e comentários ainda não estão conectados ao banco de dados.";

const css = `
.engage{max-width:710px;width:calc(100% - 10vw);margin:0 auto 44px;background:var(--cream);border:1px solid var(--plum);border-radius:20px;padding:30px;box-shadow:6px 6px 0 var(--plum)}
.engage h3{font-size:1.5rem;font-weight:600}
.eg-sub{margin:8px 0 20px;font-size:.9rem;color:var(--muted)}
.eg-votes{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px}
.eg-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid var(--plum);border-radius:999px;background:var(--paper);color:var(--plum);font-size:.88rem;cursor:pointer}
.eg-btn b{font-weight:700;min-width:1ch}
.eg-btn[data-v=likes][aria-pressed=true]{background:var(--mustard)}
.eg-btn[data-v=dislikes][aria-pressed=true]{background:var(--blush-deep)}
.eg-form{display:grid;gap:10px}
.eg-form input,.eg-form textarea{width:100%;padding:12px 16px;border:1px solid var(--plum);border-radius:14px;background:var(--paper);font-family:'Instrument Sans',sans-serif;font-size:.92rem;color:var(--plum)}
.eg-form textarea{min-height:96px;resize:vertical}
.eg-form .btn{justify-self:start}
.eg-hp{position:absolute!important;left:-9999px!important}
.eg-status{min-height:1.2em;margin:12px 0 0;font-size:.82rem;color:var(--coral-deep)}
.eg-list{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:12px}
.eg-list li{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 18px}
.eg-nome{font-weight:600}
.eg-data{margin-left:8px;font-size:.76rem;color:var(--muted)}
.eg-list p{margin:6px 0 0;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
@media(max-width:600px){.engage{padding:22px 18px}}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

const thumb = (baixo) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"${baixo ? ' style="transform:rotate(180deg)"' : ""}><path d="M7 11v9H4v-9h3zM7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>`;

document.querySelectorAll(".engage").forEach((el) => {
  const slug = el.dataset.artigo;
  const chaveVoto = "absolute:voto:" + slug;
  const chaveTempo = "absolute:comentou";

  el.innerHTML = `
    <h3>O que você achou?</h3>
    <p class="eg-sub">Deixe sua reação e, se quiser, um comentário.</p>
    <div class="eg-votes">
      <button type="button" class="eg-btn" data-v="likes" aria-pressed="false">${thumb(false)}<span>Gostei</span><b>0</b></button>
      <button type="button" class="eg-btn" data-v="dislikes" aria-pressed="false">${thumb(true)}<span>Não gostei</span><b>0</b></button>
    </div>
    <form class="eg-form">
      <input name="nome" maxlength="40" placeholder="Seu nome (opcional)" aria-label="Seu nome">
      <input name="site" class="eg-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <textarea name="texto" maxlength="500" required placeholder="Escreva um comentário" aria-label="Comentário"></textarea>
      <button type="submit" class="btn coral">Comentar</button>
    </form>
    <p class="eg-status" role="status"></p>
    <ul class="eg-list"></ul>`;

  const status = (m) => { el.querySelector(".eg-status").textContent = m || ""; };
  const botoes = el.querySelectorAll(".eg-btn");
  const marcar = () => {
    const atual = localStorage.getItem(chaveVoto);
    botoes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === atual)));
  };
  marcar();

  const ref = ativo ? fb.doc(db, "artigos", slug) : null;

  botoes.forEach((b) => b.addEventListener("click", async () => {
    if (!ativo) return status(AVISO);
    const atual = localStorage.getItem(chaveVoto);
    const novo = b.dataset.v;
    const upd = { likes: fb.increment(0), dislikes: fb.increment(0) };
    if (atual === novo) upd[novo] = fb.increment(-1);
    else { upd[novo] = fb.increment(1); if (atual) upd[atual] = fb.increment(-1); }
    try {
      await fb.setDoc(ref, upd, { merge: true });
      if (atual === novo) localStorage.removeItem(chaveVoto); else localStorage.setItem(chaveVoto, novo);
      marcar(); status("");
      if (window.gtag) gtag("event", "article_vote", { article: slug, vote: atual === novo ? "removed" : novo });
    } catch (e) { status("Não foi possível registrar agora. Tente de novo em instantes."); }
  }));

  el.querySelector(".eg-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    if (!ativo) return status(AVISO);
    if (f.site.value) return; // campo-isca: só robô preenche
    const texto = f.texto.value.trim();
    if (!texto) return;
    if (Date.now() - Number(localStorage.getItem(chaveTempo) || 0) < 30000) return status("Aguarde alguns segundos para comentar de novo.");
    try {
      await fb.addDoc(fb.collection(ref, "comentarios"), { nome: f.nome.value.trim() || "Anônimo", texto, criadoEm: fb.serverTimestamp() });
      localStorage.setItem(chaveTempo, String(Date.now()));
      f.texto.value = ""; status("");
      if (window.gtag) gtag("event", "article_comment", { article: slug });
    } catch (e) { status("Não foi possível enviar o comentário agora."); }
  });

  if (!ativo) return;

  fb.onSnapshot(ref, (s) => {
    const d = s.data() || {};
    botoes[0].querySelector("b").textContent = Math.max(0, d.likes || 0);
    botoes[1].querySelector("b").textContent = Math.max(0, d.dislikes || 0);
  });

  fb.onSnapshot(fb.query(fb.collection(ref, "comentarios"), fb.orderBy("criadoEm", "desc"), fb.limit(50)), (snap) => {
    const ul = el.querySelector(".eg-list");
    ul.replaceChildren();
    snap.forEach((d) => {
      const c = d.data();
      const li = document.createElement("li");
      const nome = document.createElement("span"); nome.className = "eg-nome"; nome.textContent = c.nome || "Anônimo";
      const data = document.createElement("span"); data.className = "eg-data";
      data.textContent = c.criadoEm ? c.criadoEm.toDate().toLocaleDateString("pt-BR") : "agora";
      const p = document.createElement("p"); p.textContent = c.texto;
      li.append(nome, data, p);
      ul.append(li);
    });
  });
});
