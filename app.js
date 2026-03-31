let currentLevel = 5;
let consecutiveCorrect = 0;
let historyList = [];
let currentQuestion = null;
let initialMoodData = null;

const screenMood = document.getElementById('screen-mood');
const screenQuote = document.getElementById('screen-quote');
const screenQuiz = document.getElementById('screen-quiz');
const screenResult = document.getElementById('screen-result');

const moodsContainer = document.getElementById('moods-container');
const quoteEmoji = document.getElementById('quote-emoji');
const quoteBox = document.getElementById('quote-box');
const messageBox = document.getElementById('message-box');

const diffBadge = document.getElementById('difficulty-badge');
const comboBadge = document.getElementById('combo-badge');
const quizTitle = document.getElementById('quiz-title');
const optionsContainer = document.getElementById('options-container');
const shortAnswerContainer = document.getElementById('short-answer-container');
const shortInput = document.getElementById('short-input');
const btnSubmitShort = document.getElementById('btn-submit-short');
const feedbackBox = document.getElementById('feedback-box');
const empathyMessageBox = document.getElementById('empathy-message-box');
const historyListElement = document.getElementById('history-list');
const btnStartQuiz = document.getElementById('btn-start-quiz');
const btnRestart = document.getElementById('btn-restart');

function switchScreen(from, to) {
  from.classList.remove('active');
  to.classList.add('active');
}

function getQuestionSet(level) {
  const db = window[`dbQuestionsLevel${level}`];
  return Array.isArray(db) ? db : [];
}

function getCorrectAnswerText(question) {
  if (question.type === 'multiple') {
    const correctOption = question.options?.find((option) => option.id === question.correctId);
    return correctOption ? correctOption.text : String(question.correctId);
  }

  return String(question.correctId);
}

function getUserAnswerText(question, userAnswer) {
  if (question.type === 'multiple') {
    const selectedOption = question.options?.find((option) => option.id === userAnswer);
    return selectedOption ? selectedOption.text : String(userAnswer ?? '-');
  }

  return String(userAnswer ?? '-');
}

function buildFeedbackMessage(question) {
  return `Correct answer: ${getCorrectAnswerText(question)}`;
}

function renderFeedback(isCorrect) {
  feedbackBox.style.display = 'block';
  feedbackBox.className = `feedback-box ${isCorrect ? 'feedback-success' : 'feedback-error'}`;

  const title = isCorrect ? 'Correct!' : 'Not quite.';
  const message = buildFeedbackMessage(currentQuestion);
  const buttonStyle = isCorrect ? '' : ' style="background:#ef4444;"';

  feedbackBox.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    <button class="btn btn-primary"${buttonStyle} id="btn-next-question">Next Question</button>
  `;

  document.getElementById('btn-next-question').addEventListener('click', proceedToNext);
}

function renderQuestion() {
  const db = getQuestionSet(currentLevel);

  if (db.length === 0) {
    quizTitle.innerText = 'Questions could not be loaded.';
    optionsContainer.innerHTML = '';
    shortAnswerContainer.style.display = 'none';
    feedbackBox.style.display = 'block';
    feedbackBox.className = 'feedback-box feedback-error';
    feedbackBox.innerHTML = '<p>No data is available for this level.</p>';
    return;
  }

  const unseenQuestions = db.filter((question) => !historyList.some((item) => item.id === question.id));
  const pool = unseenQuestions.length > 0 ? unseenQuestions : db;
  currentQuestion = pool[Math.floor(Math.random() * pool.length)];

  diffBadge.innerText = `Level: ${currentLevel}`;
  comboBadge.innerText = `COMBO: ${consecutiveCorrect} / 3`;
  comboBadge.classList.remove('combo-bump');
  quizTitle.innerText = String(currentQuestion.title ?? '');

  feedbackBox.style.display = 'none';
  feedbackBox.className = 'feedback-box';
  shortInput.value = '';
  shortInput.disabled = false;
  btnSubmitShort.disabled = false;
  optionsContainer.innerHTML = '';

  if (currentQuestion.type === 'multiple') {
    optionsContainer.style.display = 'flex';
    shortAnswerContainer.style.display = 'none';

    currentQuestion.options.forEach((option) => {
      const button = document.createElement('button');
      button.className = 'option-btn';
      button.innerText = option.text;
      button.addEventListener('click', () => handleAnswer(option.id, button));
      optionsContainer.appendChild(button);
    });
    return;
  }

  optionsContainer.style.display = 'none';
  shortAnswerContainer.style.display = 'block';
}

function handleCorrectAnswer() {
  consecutiveCorrect += 1;
  currentLevel = Math.min(10, currentLevel + 1);
  comboBadge.innerText = `COMBO: ${consecutiveCorrect} / 3`;
  comboBadge.classList.add('combo-bump');
}

function handleWrongAnswer() {
  consecutiveCorrect = 0;
  currentLevel = Math.max(1, currentLevel - 1);
  comboBadge.innerText = 'COMBO: 0 / 3';

  document.body.classList.add('flash-error');
  screenQuiz.classList.add('shake');

  setTimeout(() => {
    document.body.classList.remove('flash-error');
    screenQuiz.classList.remove('shake');
  }, 400);
}

function lockQuestionInputs() {
  if (currentQuestion.type === 'multiple') {
    optionsContainer.querySelectorAll('.option-btn').forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  shortInput.disabled = true;
  btnSubmitShort.disabled = true;
}

function highlightCorrectOption(selectedButton, isCorrect) {
  if (currentQuestion.type !== 'multiple') {
    return;
  }

  const buttons = [...optionsContainer.querySelectorAll('.option-btn')];
  const correctIndex = currentQuestion.options.findIndex((option) => option.id === currentQuestion.correctId);

  if (selectedButton) {
    selectedButton.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  if (!isCorrect && buttons[correctIndex]) {
    buttons[correctIndex].classList.add('correct');
  }
}

function handleAnswer(selectedId, buttonElement) {
  if (!currentQuestion) {
    return;
  }

  lockQuestionInputs();

  const normalizedAnswer = String(selectedId).trim();
  const normalizedCorrectAnswer = String(currentQuestion.correctId).trim();
  const isCorrect = normalizedAnswer === normalizedCorrectAnswer;

  if (isCorrect) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }

  highlightCorrectOption(buttonElement, isCorrect);

  historyList.push({
    id: currentQuestion.id,
    title: String(currentQuestion.title ?? ''),
    userAnswerLabel: getUserAnswerText(currentQuestion, normalizedAnswer),
    correctAnswerLabel: getCorrectAnswerText(currentQuestion),
    isCorrect
  });

  renderFeedback(isCorrect);
}

function proceedToNext() {
  if (consecutiveCorrect >= 3) {
    showResult();
    return;
  }

  renderQuestion();
}

function showResult() {
  if (window.confetti) {
    window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  }

  if (initialMoodData) {
    empathyMessageBox.innerHTML = `
      <div class="empathy-emoji">${initialMoodData.emoji}</div>
      <p>You started with <strong>${initialMoodData.label}</strong>. Nice work getting three answers right in a row.</p>
    `;
  } else {
    empathyMessageBox.innerHTML = '<p>Nice work finishing with three correct answers in a row.</p>';
  }

  historyListElement.innerHTML = '';

  historyList.forEach((item, index) => {
    const listItem = document.createElement('li');
    const colorStyle = item.isCorrect ? 'color:#10b981;' : 'color:#ef4444;';
    const mark = item.isCorrect ? 'O' : 'X';

    listItem.innerHTML = `
      <div class="history-q">Q${index + 1}. ${item.title}</div>
      <div style="${colorStyle}">Your answer: ${item.userAnswerLabel} (${mark}) | Correct: <span class="history-a">${item.correctAnswerLabel}</span></div>
    `;

    historyListElement.appendChild(listItem);
  });

  switchScreen(screenQuiz, screenResult);
}

function initMoods() {
  const moods = window.dbMoods;

  if (!moods || typeof moods !== 'object') {
    moodsContainer.innerHTML = '<p>Mood data could not be loaded.</p>';
    return;
  }

  moodsContainer.innerHTML = '';

  Object.entries(moods).forEach(([key, data]) => {
    const button = document.createElement('button');
    button.className = 'btn mood-btn';
    button.dataset.mood = key;
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'emoji';
    emojiSpan.textContent = data.emoji;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = data.label;

    button.appendChild(emojiSpan);
    button.appendChild(labelSpan);

    button.addEventListener('click', () => {
      initialMoodData = data;
      const quote = data.quotes[Math.floor(Math.random() * data.quotes.length)];

      quoteEmoji.innerText = data.emoji;
      quoteBox.innerText = `"${quote}"`;
      messageBox.innerText = data.message;

      switchScreen(screenMood, screenQuote);
    });

    moodsContainer.appendChild(button);
  });
}

btnStartQuiz.addEventListener('click', () => {
  renderQuestion();
  switchScreen(screenQuote, screenQuiz);
});

btnSubmitShort.addEventListener('click', () => {
  const answer = shortInput.value.trim();

  if (!answer) {
    shortInput.focus();
    return;
  }

  handleAnswer(answer, null);
});

shortInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    btnSubmitShort.click();
  }
});

btnRestart.addEventListener('click', () => {
  consecutiveCorrect = 0;
  historyList = [];
  currentLevel = 5;
  currentQuestion = null;
  initialMoodData = null;
  switchScreen(screenResult, screenMood);
});

initMoods();
