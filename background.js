const API_KEY = "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";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let prompt = "";

  if (["drag-drop", "radio-box", "checkbox"].includes(message.type)) {
    prompt = `Question:\n${message.question}\n\nChoices:\n${message.choices.join("\n")}\n\nProvide ONLY the correct choice(s), one per line. Amount of choices should match amount of the answer containers.`;
  } else if (message.type === "short-answer") {
    prompt = `Question:\n${message.question}\n\nAnswer briefly in no more than 3 words, no explanations, if it is a question that involves writing a code, you can go more than 3 words, don't put ''' thing, don't end your sentence with a dot.`;
  }

  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        { role: "system", content: "Provide exact correct choice(s) or brief, concise short-answer responses with no explanations." },
        { role: "user", content: prompt }
      ]
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      sendResponse({});
      return;
    }

    let responseText = data.choices[0].message.content.trim();
    if (message.type === "short-answer") {
      sendResponse({ answer: responseText });
    } else {
      let correctChoices = responseText.split("\n").map(line => line.trim()).filter(Boolean);
      sendResponse({ correctChoices });
    }
  })
  .catch(err => {
    sendResponse({});
  });

  return true;
});