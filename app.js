// 전역 변수 설정
let currentDifficulty = 'mid'; // 시작 난이도는 '중(mid)'
let consecutiveCorrect = 0;
let historyList = [];
let currentQuestion = null;

// DOM Elements
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
const historyListElement = document.getElementById('history-list');

// 1. 초기 16가지 감정 버튼 렌더링
function initMoods() {
  const moods = window.dbMoods;
  for (const [key, data] of Object.entries(moods)) {
    const btn = document.createElement('button');
    btn.className = 'btn mood-btn';
    btn.dataset.mood = key;
    btn.innerHTML = `<span class="emoji">${data.emoji}</span><span>${data.label}</span>`;
    
    btn.addEventListener('click', () => {
      // 랜덤 명언 추출
      const randomQuote = data.quotes[Math.floor(Math.random() * data.quotes.length)];
      
      quoteEmoji.innerText = data.emoji;
      quoteBox.innerText = `"${randomQuote}"`;
      messageBox.innerText = data.message;
      
      switchScreen(screenMood, screenQuote);
    });
    
    moodsContainer.appendChild(btn);
  }
}

// 2. 퀴즈 시작
document.getElementById('btn-start-quiz').addEventListener('click', () => {
  renderQuestion();
  switchScreen(screenQuote, screenQuiz);
});

// 3. 문제 렌더링
function renderQuestion() {
  // 난이도별 데이터베이스 선택
  let db;
  let diffLabel = "";
  if (currentDifficulty === 'low') { db = window.dbQuestionsLow; diffLabel = "하"; }
  else if (currentDifficulty === 'mid') { db = window.dbQuestionsMid; diffLabel = "중"; }
  else { db = window.dbQuestionsHigh; diffLabel = "상"; }

  // 풀지 않은 문제 중 무작위 선택
  const unseen = db.filter(q => !historyList.some(h => h.id === q.id));
  if (unseen.length === 0) {
    // 모든 문제를 풀었다면 중복 허용 (테스트용)
    currentQuestion = db[Math.floor(Math.random() * db.length)];
  } else {
    currentQuestion = unseen[Math.floor(Math.random() * unseen.length)];
  }

  // UI 업데이트
  diffBadge.innerText = `현재 난이도: ${diffLabel}`;
  comboBadge.innerText = `연속 정답: ${consecutiveCorrect} / 3`;
  quizTitle.innerText = currentQuestion.title;
  
  // 초기화
  feedbackBox.style.display = 'none';
  feedbackBox.className = 'feedback-box';
  shortInput.value = '';
  shortInput.disabled = false;
  btnSubmitShort.disabled = false;
  optionsContainer.innerHTML = '';

  // 타입별 뷰 분기
  if (currentQuestion.type === 'multiple') {
    optionsContainer.style.display = 'flex';
    shortAnswerContainer.style.display = 'none';
    
    currentQuestion.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerText = opt.text;
      btn.onclick = () => handleAnswer(opt.id, btn);
      optionsContainer.appendChild(btn);
    });
  } else if (currentQuestion.type === 'short') {
    optionsContainer.style.display = 'none';
    shortAnswerContainer.style.display = 'block';
  }
}

// 주관식 정답 제출 핸들러
btnSubmitShort.addEventListener('click', () => {
  const answ = shortInput.value.trim();
  if (!answ) return;
  handleAnswer(answ, null);
});

// 단답 엔터키 지원
shortInput.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') btnSubmitShort.click();
});

// 4. 정답 처리 및 난이도 조절 로직
function handleAnswer(selectedId, buttonElement) {
  // 중복 클릭 방지 제어
  if (currentQuestion.type === 'multiple') {
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);
  } else {
    shortInput.disabled = true;
    btnSubmitShort.disabled = true;
  }

  const isCorrect = (selectedId === currentQuestion.correctId);
  
  // 상태 업데이트
  if (isCorrect) {
    consecutiveCorrect++;
    // 난이도 상승
    if (currentDifficulty === 'low') currentDifficulty = 'mid';
    else if (currentDifficulty === 'mid') currentDifficulty = 'high';
  } else {
    consecutiveCorrect = 0;
    // 오답 시 난이도 하락
    if (currentDifficulty === 'high') currentDifficulty = 'mid';
    else if (currentDifficulty === 'mid') currentDifficulty = 'low';
  }

  // 히스토리에 기록
  historyList.push({
    id: currentQuestion.id,
    title: currentQuestion.title,
    userAnswer: selectedId,
    correctAnswer: currentQuestion.correctId,
    feedback: currentQuestion.feedback,
    isCorrect: isCorrect
  });

  // 버튼 스타일(객관식일 경우)
  if (buttonElement) {
    if (isCorrect) buttonElement.classList.add('correct');
    else buttonElement.classList.add('wrong');
  }

  // 피드백 박스 렌더링
  feedbackBox.style.display = 'block';
  comboBadge.innerText = `연속 정답: ${consecutiveCorrect} / 3`;

  if (isCorrect) {
    feedbackBox.classList.add('feedback-success');
    feedbackBox.innerHTML = `
      <h3>🎉 정답입니다!</h3>
      <p>${currentQuestion.feedback}</p>
      <button class="btn btn-primary" onclick="proceedToNext()">다음 문제로</button>
    `;
  } else {
    feedbackBox.classList.add('feedback-error');
    feedbackBox.innerHTML = `
      <h3>😥 오답입니다!</h3>
      <p>정답은 [ <strong>${currentQuestion.correctId}</strong> ] 였습니다. <br> ${currentQuestion.feedback}</p>
      <button class="btn btn-primary" style="background:#ef4444;" onclick="proceedToNext()">다음 문제로</button>
    `;
  }
}

// 5. 다음 단계 진행 (목표 달성 체크)
window.proceedToNext = () => {
  if (consecutiveCorrect >= 3) {
    showResult();
  } else {
    renderQuestion();
  }
};

// 6. 결과 화면 도출 (해설 포함)
function showResult() {
  historyListElement.innerHTML = '';
  
  historyList.forEach((item, index) => {
    const colorStyle = item.isCorrect ? 'color:#10b981;' : 'color:#ef4444;';
    const mark = item.isCorrect ? 'O' : 'X';
    
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="history-q">Q${index + 1}. ${item.title}</div>
      <div style="${colorStyle}">내가 고른 답: ${item.userAnswer} (${mark}) | 정답: <span class="history-a">${item.correctAnswer}</span></div>
      <div class="history-f">👉 해설: ${item.feedback}</div>
    `;
    historyListElement.appendChild(li);
  });
  
  switchScreen(screenQuiz, screenResult);
}

// 7. 다시 시작
document.getElementById('btn-restart').addEventListener('click', () => {
  consecutiveCorrect = 0;
  historyList = [];
  currentDifficulty = 'mid';
  switchScreen(screenResult, screenMood);
});

// 화살표 함수 Helper
function switchScreen(from, to) {
  from.classList.remove('active');
  to.classList.add('active');
}

// 앱 구동
initMoods();
