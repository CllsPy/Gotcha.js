const input = document.getElementById("api-key-input");
const btn = document.getElementById("api-key-save");
const status = document.getElementById("api-key-status");

// Carrega a key salva
chrome.storage.local.get("gotcha_api_key", (result) => {
  if (result.gotcha_api_key) {
    input.value = result.gotcha_api_key;
    status.textContent = "API Key configurada ✓";
    status.className = "status ok";
  }
});

btn.addEventListener("click", () => {
  const key = input.value.trim();
  if (!key.startsWith("sk-")) {
    status.textContent = 'Inválida. Deve começar com "sk-"';
    status.className = "status erro";
    return;
  }
  chrome.storage.local.set({ gotcha_api_key: key }, () => {
    status.textContent = "API Key salva ✓";
    status.className = "status ok";
  });
});
