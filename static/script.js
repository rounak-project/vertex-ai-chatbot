const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const chatMessages = document.querySelector("#chatMessages");
const sampleQuestions = document.querySelectorAll(".sample-question");

// This function adds a new message bubble to the chat window.
function addMessage(speaker, text, type) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  const speakerLabel = document.createElement("span");
  speakerLabel.className = "speaker";
  speakerLabel.textContent = speaker;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  message.appendChild(speakerLabel);
  message.appendChild(paragraph);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
}

// This small delay makes VERTEX feel like it is thinking.
function waitOneSecond() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  addMessage("You", message, "user");
  userInput.value = "";

  const thinkingMessage = addMessage("VERTEX", "Vertex is thinking...", "bot thinking");

  try {
    const fetchReply = fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const [response] = await Promise.all([fetchReply, waitOneSecond()]);
    const data = await response.json();
    thinkingMessage.remove();
    addMessage("VERTEX", data.response, "bot");
  } catch (error) {
    await waitOneSecond();
    thinkingMessage.remove();
    addMessage("VERTEX", "Connection problem. Please check if Flask is running.", "bot");
  }
});

// Clicking a sample question puts it in the input box and sends it.
sampleQuestions.forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.textContent;
    chatForm.requestSubmit();
  });
});
