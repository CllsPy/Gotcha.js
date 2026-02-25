// Cria o popup dinamicamente na página
function initGotcha() {
  if (document.getElementById("gotcha-popup")) return null;

  const div = document.createElement("div");
  div.id = "gotcha-popup";
  div.innerHTML = `
    <div id="gotcha-header">
      <strong id="texto-selecionado"></strong>
      <button id="gotcha-close" title="Fechar">×</button>
    </div>
    <div id="explicacao">Explicando…</div>
    <div id="gotcha-config" title="Configurar API Key">⚙️ Configurar API</div>
  `;
  document.body.appendChild(div);
  return div;
}

const popup = initGotcha();
if (!popup) throw new Error("Gotcha já inicializado");

const palavraEl = document.getElementById("texto-selecionado");
const explicacaoEl = document.getElementById("explicacao");
const closeBtn = document.getElementById("gotcha-close");
const configBtn = document.getElementById("gotcha-config");

let apiKey = "";
let currentController = null;

// Carrega a API Key do storage da extensão
chrome.storage.local.get("gotcha_api_key", (result) => {
  apiKey = result.gotcha_api_key || "";
});

// Configurar API Key
configBtn.addEventListener("click", () => {
  const key = prompt("Digite sua OpenAI API Key (começa com sk-):", apiKey);
  if (key !== null) {
    if (key.startsWith("sk-")) {
      apiKey = key;
      chrome.storage.local.set({ gotcha_api_key: apiKey });
      alert("API Key salva!");
    } else if (key !== "") {
      alert('API Key inválida. Deve começar com "sk-"');
    }
  }
});

// Fechar popup
function esconder() {
  popup.classList.remove("visible");
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

closeBtn.addEventListener("click", esconder);

// Clicar fora fecha
document.addEventListener("mousedown", (e) => {
  if (!popup.contains(e.target)) esconder();
});

// ESC fecha
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") esconder();
});

// Seleção de texto
document.addEventListener("mouseup", async (e) => {
  if (popup.contains(e.target)) return;

  const texto = window.getSelection().toString().trim();

  if (!texto || texto.split(/\s+/).length > 5) {
    esconder();
    return;
  }

  if (currentController) currentController.abort();
  currentController = new AbortController();

  palavraEl.textContent = texto;
  explicacaoEl.textContent = "Explicando";
  explicacaoEl.className = "loading";
  mostrar();

  const resposta = await explicar(texto, currentController.signal);
  if (resposta) {
    explicacaoEl.textContent = resposta;
    explicacaoEl.className = "";
  }
});

function mostrar() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const selRect = range.getBoundingClientRect();

  const popupWidth = 340;
  const margin = 12;

  // Posição em viewport (position: fixed)
  let left = selRect.left;
  let top = selRect.bottom + 8;

  // Clamp na borda direita
  if (left + popupWidth + margin > window.innerWidth) {
    left = window.innerWidth - popupWidth - margin;
  }
  // Clamp na borda esquerda
  if (left < margin) left = margin;

  // Se não cabe abaixo, coloca acima da seleção
  const popupHeight = 140;
  if (top + popupHeight > window.innerHeight) {
    top = selRect.top - popupHeight - 8;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.classList.add("visible");
}

async function explicar(texto, signal) {
  if (!apiKey) {
    return "Configure sua API Key clicando em ⚙️ abaixo";
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Explique conceitos como para uma criança de 10 anos, usando analogias simples. Responda em até 2 frases curtas.",
          },
          {
            role: "user",
            content: `Explique simplesmente: "${texto}"`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
      signal,
    });

    if (!res.ok) {
      if (res.status === 401) return "Erro: API Key inválida";
      if (res.status === 429) return "Erro: Muitas requisições. Aguarde.";
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content?.trim() || "Não consegui explicar."
    );
  } catch (err) {
    if (err.name === "AbortError") return "";
    console.error("Gotcha error:", err);
    return "Erro ao conectar. Verifique sua conexão.";
  }
}
