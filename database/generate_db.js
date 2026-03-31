const fs = require('fs');
const path = require('path');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOptions(correct, count = 4) {
  const options = new Set([correct]);
  while (options.size < count) {
    let offset = randomInt(-10, 10);
    if (offset === 0) offset = 1;
    const fake = correct + offset;
    if (fake >= 0) options.add(fake);
  }
  const optsArray = Array.from(options).sort(() => Math.random() - 0.5);
  const letters = ['A', 'B', 'C', 'D'];
  
  let correctId = 'A';
  const finalOptions = optsArray.map((num, i) => {
    if (num === correct) correctId = letters[i];
    return { id: letters[i], text: String(num) };
  });
  
  return { options: finalOptions, correctId };
}

function generateQuestions(level) {
  const questions = [];
  for (let i = 1; i <= 100; i++) {
    let a, b, answer, operator, title, feedback;
    const isMultiple = Math.random() > 0.5; // 50% chance for multiple choice
    
    switch (level) {
      case 1: // 1-digit add/sub
        operator = Math.random() > 0.5 ? '+' : '-';
        a = randomInt(1, 9);
        b = randomInt(1, 9);
        if (operator === '-' && a < b) [a, b] = [b, a];
        answer = operator === '+' ? a + b : a - b;
        title = `${a} ${operator} ${b} = ?`;
        feedback = operator === '+' ? `1의 자리 덧셈: ${a}에 ${b}을 더하면 ${answer}이 돼!` : `${a}개에서 ${b}개를 빼면 ${answer}개가 남아!`;
        break;
      case 2: // 2-digit + 1-digit (no carry)
        b = randomInt(1, 8);
        const a1 = randomInt(1, 8);
        const a0 = randomInt(1, 9 - b); // ensures no carry
        a = a1 * 10 + a0;
        answer = a + b;
        title = `${a} + ${b} = ?`;
        feedback = `일의 자리 ${a0}와 ${b}를 더하면 ${a0+b}이니까 십의 자리 ${a1}0과 합치면 ${answer}!`;
        break;
      case 3: // 2-digit add (with carry)
        a = randomInt(15, 85);
        b = randomInt(15, 85);
        if ((a % 10) + (b % 10) < 10) b += (10 - ((a % 10) + (b % 10))); // force carry
        answer = a + b;
        title = `${a} + ${b} = ?`;
        feedback = `일의 자리를 더하면 10이 넘어가니까 받아올림을 해야 해. ${a} 더하기 ${b}는 ${answer}이야.`;
        break;
      case 4: // 2-digit sub (with borrow)
        a = randomInt(30, 99);
        const bTens = randomInt(1, Math.floor(a/10) - 1);
        const bOnes = randomInt((a%10) + 1, 9); // force borrow
        b = bTens * 10 + bOnes;
        answer = a - b;
        title = `${a} - ${b} = ?`;
        feedback = `일의 자리에서 뺄 수 없으니 십의 자리에서 빌려와보자. ${a}에서 ${b}를 빼면 ${answer}이야!`;
        break;
      case 5: // 2~5 times table
        a = randomInt(2, 5);
        b = randomInt(2, 9);
        answer = a * b;
        title = `${a} × ${b} = ?`;
        feedback = `구구단 ${a}단! ${a} 곱하기 ${b}는 ${answer}!`;
        break;
      case 6: // 6~9 times table
        a = randomInt(6, 9);
        b = randomInt(2, 9);
        answer = a * b;
        title = `${a} × ${b} = ?`;
        feedback = `구구단 심화. ${a}단을 외워봐! 정답은 ${answer}이야.`;
        break;
      case 7: // simple division
        b = randomInt(2, 9);
        answer = randomInt(2, 9);
        a = b * answer;
        title = `${a} ÷ ${b} = ?`;
        feedback = `거꾸로 구구단을 생각해봐. ${b} × 무엇이 ${a}일까? 정답은 ${answer}!`;
        break;
      case 8: // 2-digit x 1-digit
        a = randomInt(11, 40); // keep it reasonable
        b = randomInt(2, 5);
        answer = a * b;
        title = `${a} × ${b} = ?`;
        feedback = `십의 자리와 일의 자리를 각각 곱해서 더해보자. ${a} × ${b} = ${answer}!`;
        break;
      case 9: // 2-digit divide by 1-digit
        b = randomInt(2, 5);
        answer = randomInt(11, 25);
        a = b * answer;
        title = `${a} ÷ ${b} = ?`;
        feedback = `먼저 십의 자리를 몫으로 나누고 남은 부분과 일의 자리를 다시 나누면 ${answer}이 돼.`;
        break;
      case 10: // mixed / 3-digit
        if (Math.random() > 0.5) {
          a = randomInt(100, 500);
          b = randomInt(50, 400);
          answer = a + b;
          title = `${a} + ${b} = ?`;
          feedback = `백의 자리, 십의 자리, 일의 자리를 각각 맞춰 더하면 ${answer}이지!`;
        } else {
          a = randomInt(5, 15);
          b = randomInt(2, 5);
          const c = randomInt(2, 5);
          answer = (a + b) * c;
          title = `(${a} + ${b}) × ${c} = ?`;
          feedback = `괄호 안의 ${a}+${b}=${a+b}를 먼저 계산하고, 거기에 ${c}를 곱하면 ${answer}이 돼!`;
        }
        break;
    }

    const qItem = {
      id: `L${level}_${i}`,
      type: isMultiple ? "multiple" : "short",
      title: title,
      correctId: isMultiple ? null : String(answer), // string for short
      feedback: feedback
    };

    if (isMultiple) {
      const opts = generateOptions(answer);
      qItem.options = opts.options;
      qItem.correctId = opts.correctId;
    }

    questions.push(qItem);
  }
  return questions;
}

const dbFolder = path.join(__dirname, '.');

for (let level = 1; level <= 10; level++) {
  const data = generateQuestions(level);
  const validJsContent = `window.dbQuestionsLevel${level} = ${JSON.stringify(data, null, 2)};`;
  fs.writeFileSync(path.join(dbFolder, `questions_level_${level}.js`), validJsContent);
}

console.log("SUCCESS: 10 levels of 100 questions generated.");
