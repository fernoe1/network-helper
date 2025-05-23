let lastClickTime = 0;
const clickThreshold = 300;

document.addEventListener("click", async (event) => {
  let currentTime = new Date().getTime();
  if (currentTime - lastClickTime > clickThreshold) {
    lastClickTime = currentTime;
    return;
  }

  lastClickTime = 0;

  let questionDiv = event.target.closest(".que");
  if (!questionDiv) return;

  const cleanText = str => str.replace(/\s+/g, ' ').replace(/\xa0/g, ' ').trim();
  let questionContent = cleanText(questionDiv.querySelector(".qtext").innerText);

  if (questionDiv.querySelector('input[type="radio"]')) {
    handleRadioBox(questionDiv, questionContent, cleanText);
    return;
  }

  if (questionDiv.querySelector('input[type="checkbox"]')) {
    handleCheckbox(questionDiv, questionContent, cleanText);
    return;
  }

  if (questionDiv.querySelector('input[type="text"]')) {
    handleShortAnswer(questionDiv, questionContent);
    return;
  }

  if (questionDiv.querySelector('.draghome.unplaced')) {
    handleDragDrop(questionDiv, questionContent, cleanText);
    return;
  }
});

async function handleRadioBox(questionDiv, questionContent, cleanText) {
  let choices = Array.from(questionDiv.querySelectorAll('div.flex-fill.ml-1')).map(el => cleanText(el.innerText));

  chrome.runtime.sendMessage({ question: questionContent, choices, type: "radio-box" }, response => {
    if (!response.correctChoices || !response.correctChoices.length) return;

    let answer = response.correctChoices[0];
    Array.from(questionDiv.querySelectorAll('div.flex-fill.ml-1')).forEach((optionDiv, idx) => {
      if (cleanText(optionDiv.innerText) === answer) {
        optionDiv.closest(".r0, .r1").querySelector('input[type="radio"]').click();
      }
    });
  });
}

async function handleShortAnswer(questionDiv, questionContent) {
  chrome.runtime.sendMessage({ question: questionContent, type: "short-answer" }, response => {
    if (!response.answer) return;
    let shortAnswerInput = questionDiv.querySelector('input[type="text"]');
    shortAnswerInput.value = response.answer;
    shortAnswerInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function handleDragDrop(mainContainer, questionContent, cleanText) {
  const answerContainer = mainContainer.querySelector(".answercontainer");
  const dragOptionsNodes = answerContainer.querySelectorAll(".draghome.unplaced");
  const dragOptions = Array.from(dragOptionsNodes).map(el => cleanText(el.innerText));

  chrome.runtime.sendMessage({ question: questionContent, choices: dragOptions, type: "drag-drop" },
    async response => {
      if (response && response.correctChoices) {
        for (let idx = 0; idx < response.correctChoices.length; idx++) {
          const choiceText = cleanText(response.correctChoices[idx]);
          const dragElement = Array.from(answerContainer.querySelectorAll(".draghome.unplaced"))
            .find(el => cleanText(el.innerText) === choiceText);
          const dropPlaceholder = mainContainer.querySelector(`span.place${idx + 1}.drop`);
          if (dragElement && dropPlaceholder) {
            await simulateMouseDragDrop(dragElement, dropPlaceholder);
            await sleep(250);
          }
        }
      }
    }
  );
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function simulateMouseDragDrop(sourceNode, destinationNode) {
  const rectSrc = sourceNode.getBoundingClientRect();
  const rectDest = destinationNode.getBoundingClientRect();

  const fireMouseEvent = (element, type, x, y) => {
    element.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y
    }));
  };

  fireMouseEvent(sourceNode, "mousedown", rectSrc.left + rectSrc.width / 2, rectSrc.top + rectSrc.height / 2);
  await sleep(100);
  fireMouseEvent(destinationNode, "mousemove", rectDest.left + rectDest.width / 2, rectDest.top + rectDest.height / 2);
  await sleep(100);
  fireMouseEvent(destinationNode, "mouseup", rectDest.left + rectDest.width / 2, rectDest.top + rectDest.height / 2);
}

async function handleCheckbox(questionDiv, questionContent, cleanText) {
  let choices = Array.from(questionDiv.querySelectorAll('div.flex-fill.ml-1')).map(el => cleanText(el.innerText));

  chrome.runtime.sendMessage({ question: questionContent, choices, type: "checkbox" }, response => {
    if (!response.correctChoices || !response.correctChoices.length) return;

    let correctAnswers = response.correctChoices;
    Array.from(questionDiv.querySelectorAll('div.flex-fill.ml-1')).forEach((optionDiv) => {
      let label = cleanText(optionDiv.innerText);
      if (correctAnswers.includes(label)) {
        const checkbox = optionDiv.closest(".r0, .r1").querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) {
          checkbox.click();
        }
      }
    });
  });
}
