// Cria o popup dinamicamente
function initGotcha() {
  if (document.getElementById("gotcha-popup")) return;

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
const palavraEl = document.getElementById("texto-selecionado");
const explicacaoEl = document.getElementById("explicacao");
const closeBtn = document.getElementById("gotcha-close");
const configBtn = document.getElementById("gotcha-config");

let apiKey = localStorage.getItem("gotcha_api_key") || "";
let currentController = null;

// Configurar API Key
configBtn.addEventListener("click", () => {
  const key = prompt("Digite sua OpenAI API Key (começa com sk-):", apiKey);
  if (key !== null) {
    if (key.startsWith("sk-")) {
      apiKey = key;
      localStorage.setItem("gotcha_api_key", apiKey);
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
  // Ignora se clicou no popup
  if (popup.contains(e.target)) return;

  const texto = window.getSelection().toString().trim();

  // Só explica se tiver texto e for até 5 palavras
  if (!texto || texto.split(/\s+/).length > 5) {
    esconder();
    return;
  }

  // Cancela requisição anterior
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Mostra popup
  palavraEl.textContent = texto;
  explicacaoEl.textContent = "Explicando";
  explicacaoEl.className = "loading";
  mostrar();

  // Busca explicação
  const resposta = await explicar(texto, currentController.signal);
  explicacaoEl.textContent = resposta;
  explicacaoEl.className = "";
});

function mostrar() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const selRect = range.getBoundingClientRect();

  const winWidth = window.innerWidth;

  // Alinha à esquerda da seleção, 8px abaixo dela
  let left = selRect.left + window.scrollX;
  let top = selRect.bottom + window.scrollY + 8;

  // Se passar da borda direita, recua
  if (left + 280 > winWidth + window.scrollX) {
    left = winWidth + window.scrollX - 295;
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
      if (res.status === 429)
        return "Erro: Muitas requisições. Aguarde um momento.";
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

// Verifica se tem API key configurada ao iniciar
if (!apiKey) {
  console.log("Gotcha: Clique em ⚙️ no popup para configurar sua API Key");
}
