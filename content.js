chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    },
    async (results) => {
      if (results && results[0] && results[0].result) {
        const textoSelecionado = results[0].result.trim();

        if (textoSelecionado) {
          document.getElementById("texto-selecionado").textContent =
            textoSelecionado;

          document.getElementById("explicacao").textContent = "Explicando...";

          const explicacao = await fetchSuggestion(textoSelecionado);
          document.getElementById("explicacao").textContent = explicacao;
        }
      }
    },
  );
});

const fetchSuggestion = async (textoSelecionado) => {
  const apiKey = "";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente que explica palavras e conceitos de forma clara e concisa, em plain-text e usando apenas 100 chars.",
          },
          {
            role: "user",
            content: `Explique o seguinte termo de forma simples: "${textoSelecionado}"`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim();
    } else {
      return "Erro ao obter explicação.";
    }
  } catch (error) {
    console.error("Erro:", error);
    return "Erro ao conectar com a API.";
  }
};
