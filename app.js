// 전역 변수 세팅
let currentLevel = 5; // 난이도 단계 1~10 중 5로 시작
let consecutiveCorrect = 0;
let historyList = [];
let currentQuestion = null;
let initialMoodData = null; // 사용자가 처음에 누른 감정 객체 임시저장

// DOM 접근
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

// 1. 초기 16가지 감정 버튼 생성
function initMoods() {
  const moods = window.dbMoods;
  for (const [key, data] of Object.entries(moods)) {
    const btn = document.createElement('button');
    btn.className = 'btn mood-btn';
    btn.dataset.mood = key;
    btn.innerHTML = `<span class="emoji">${data.emoji}</span><span>${data.label}</span>`;
    
    btn.addEventListener('click', () => {
      // 감정 저장 (결과창에서 사용)
      initialMoodData = data;
      
      const randomQuote = data.quotes[Math.floor(Math.random() * data.quotes.length)];
      quoteEmoji.innerText = data.emoji;
      quoteBox.innerText = `"${randomQuote}"`;
      messageBox.innerText = data.message;
      
      switchScreen(screenMood, screenQuote);
    });
    
    moodsContainer.appendChild(btn);
  }
}

// 2. 퀴즈 진입
document.getElementById('btn-start-quiz').addEventListener('click', () => {
  renderQuestion();
  switchScreen(screenQuote, screenQuiz);
});

// 3. 문제 출력 시스템 (10단계)
function renderQuestion() {
  // DB Mapping 동적 생성 방식: window.dbQuestionsLevel1 ~ 10
  const dbName = `dbQuestionsLevel${currentLevel}`;
  const db = window[dbName];

  // 풀지 않은 문제 중 무작위 선택
  const unseen = db.filter(q => !historyList.some(h => h.id === q.id));
  if (unseen.length === 0) {
    currentQuestion = db[Math.floor(Math.random() * db.length)];
  } else {
    currentQuestion = unseen[Math.floor(Math.random() * unseen.length)];
  }

  // 상단 바
  diffBadge.innerText = `Level: ${currentLevel}`;
  comboBadge.innerText = `COMBO: ${consecutiveCorrect} / 3`;
  comboBadge.classList.remove('combo-bump'); // 콤보 시각효과 초기화
  
  quizTitle.innerText = currentQuestion.title;
  
  // 리셋
  feedbackBox.style.display = 'none';
  feedbackBox.className = 'feedback-box';
  shortInput.value = '';
  shortInput.disabled = false;
  btnSubmitShort.disabled = false;
  optionsContainer.innerHTML = '';

  // 뷰 분기 (객관식 / 단답)
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

// 단답 입력 이벤트
btnSubmitShort.addEventListener('click', () => {
  const answ = shortInput.value.trim();
  if (!answ) return;
  handleAnswer(answ, null);
});
shortInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') btnSubmitShort.click();
});

// 4. 이벤트 핸들러 및 시각효과(VFX) 엔진
function handleAnswer(selectedId, buttonElement) {
  // Lock Check
  if (currentQuestion.type === 'multiple') {
    optionsContainer.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  } else {
    shortInput.disabled = true;
    btnSubmitShort.disabled = true;
  }

  const isCorrect = (selectedId === currentQuestion.correctId);
  
  // 상태 변화
  if (isCorrect) {
    consecutiveCorrect++;
    currentLevel = Math.min(10, currentLevel + 1); // 최대 10 레벨
    
    // 타격감: 콤보 펌핑 이펙트 재생
    comboBadge.innerText = `COMBO: ${consecutiveCorrect} / 3`;
    comboBadge.classList.add('combo-bump');
    
  } else {
    consecutiveCorrect = 0;
    currentLevel = Math.max(1, currentLevel - 1); // 최소 1 레벨
    comboBadge.innerText = `COMBO: 0 / 3`;
    
    // 실패 타격감: 화면 셰이크 + 붉은번뜩임 효과 재생
    document.body.classList.add('flash-error');
    screenQuiz.classList.add('shake');
    setTimeout(() => {
      document.body.classList.remove('flash-error');
      screenQuiz.classList.remove('shake');
    }, 400); // 0.4초 후 제거 트리거
  }

  // 역사 기록
  historyList.push({
    id: currentQuestion.id,
    title: currentQuestion.title,
    userAnswer: selectedId,
    correctAnswer: currentQuestion.correctId,
    feedback: currentQuestion.feedback,
    isCorrect: isCorrect
  });

  // 스타일 주입
  if (buttonElement) {
    if (isCorrect) buttonElement.classList.add('correct');
    else buttonElement.classList.add('wrong');
  }

  // 피드백 제공
  feedbackBox.style.display = 'block';
  if (isCorrect) {
    feedbackBox.classList.add('feedback-success');
    feedbackBox.innerHTML = `<h3>🎉 정답입니다! (레벨업)</h3><p>${currentQuestion.feedback}</p><button class="btn btn-primary" onclick="proceedToNext()">다음 문제로</button>`;
  } else {
    feedbackBox.classList.add('feedback-error');
    let correctDesc = currentQuestion.type === 'multiple' ? `<strong>옵션 ${currentQuestion.correctId}</strong>` : `<strong>${currentQuestion.correctId}</strong>`;
    feedbackBox.innerHTML = `<h3>😥 오답입니다! (레벨 강등됨)</h3><p>정답은 [ ${correctDesc} ] 였습니다. <br> ${currentQuestion.feedback}</p><button class="btn btn-primary" style="background:#ef4444;" onclick="proceedToNext()">다음 문제로</button>`;
  }
}

// 5. 진행 분기
window.proceedToNext = () => {
  if (consecutiveCorrect >= 3) {
    showResult();
  } else {
    renderQuestion();
  }
};

// 6. 결과창 및 파티클 연출 (감정 멘트 포함)
function showResult() {
  // 1. 파티클 이펙트 폭죽 쏘기
  if (window.confetti) {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }});
  }
  
  // 2. 초기 감정에 맞춘 동적 위로 메시지 주입
  if (initialMoodData) {
    empathyMessageBox.innerHTML = `
      <div class="empathy-emoji">${initialMoodData.emoji}</div>
      <p>처음에 <strong>'${initialMoodData.label}'</strong>고 하셨는데,<br> 지금 3연속 콤보를 달성한 멋진 능력으로 조금이나마 마음에 에너지가 채워지셨기를 바라요!</p>
    `;
  }

  // 3. 기록 노출
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

// 7. 재시작
document.getElementById('btn-restart').addEventListener('click', () => {
  consecutiveCorrect = 0;
  historyList = [];
  currentLevel = 5; // 레벨 리셋
  switchScreen(screenResult, screenMood);
});

// 화면 로직
function switchScreen(from, to) {
  from.classList.remove('active');
  to.classList.add('active');
}

// 가동
initMoods();
