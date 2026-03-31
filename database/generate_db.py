import random
import os
import json

def generate_options(correct, count=4):
    options = {correct}
    while len(options) < count:
        offset = random.randint(-10, 10)
        if offset == 0: offset = 1
        fake = correct + offset
        if fake >= 0:
            options.add(fake)
    opts_list = list(options)
    random.shuffle(opts_list)
    
    letters = ['A', 'B', 'C', 'D']
    correct_id = 'A'
    final_options = []
    
    for i, num in enumerate(opts_list):
        if num == correct:
            correct_id = letters[i]
        final_options.append({"id": letters[i], "text": str(num)})
        
    return final_options, correct_id

def generate_questions(level):
    questions = []
    for i in range(1, 101):
        is_multiple = random.choice([True, False])
        
        if level == 1:
            op = random.choice(['+', '-'])
            a = random.randint(1, 9)
            b = random.randint(1, 9)
            if op == '-' and a < b:
                a, b = b, a
            ans = a + b if op == '+' else a - b
            title = f"{a} {op} {b} = ?"
            feedback = f"1의 자리 계산: {ans}이지!"
            
        elif level == 2:
            b = random.randint(1, 8)
            a1 = random.randint(1, 8)
            a0 = random.randint(1, 9 - b)
            a = a1 * 10 + a0
            ans = a + b
            title = f"{a} + {b} = ?"
            feedback = f"일의 자리끼리 더하면 {a0+b}이니까 결과는 {ans}이야."
            
        elif level == 3:
            a = random.randint(15, 85)
            b = random.randint(15, 85)
            if (a % 10) + (b % 10) < 10:
                b += (10 - ((a % 10) + (b % 10)))
            ans = a + b
            title = f"{a} + {b} = ?"
            feedback = f"일의 자리를 받아올림 해야 해. 결과는 {ans}이야."
            
        elif level == 4:
            a = random.randint(30, 99)
            b_tens = random.randint(1, (a // 10) - 1) if a // 10 > 1 else 1
            b_ones = random.randint((a % 10) + 1, 9) if (a % 10) < 9 else 9
            b = b_tens * 10 + b_ones
            if b >= a: b = a - 1 # Fallback
            ans = a - b
            title = f"{a} - {b} = ?"
            feedback = f"받아내림을 해서 계산하면 {ans}이야!"
            
        elif level == 5:
            a = random.randint(2, 5)
            b = random.randint(2, 9)
            ans = a * b
            title = f"{a} × {b} = ?"
            feedback = f"구구단 {a}단! 정답은 {ans}!"
            
        elif level == 6:
            a = random.randint(6, 9)
            b = random.randint(2, 9)
            ans = a * b
            title = f"{a} × {b} = ?"
            feedback = f"구구단 심화. 정답은 {ans}!"
            
        elif level == 7:
            b = random.randint(2, 9)
            ans = random.randint(2, 9)
            a = b * ans
            title = f"{a} ÷ {b} = ?"
            feedback = f"거꾸로 생각하면 {b} × {ans} = {a} 이니까 몫은 {ans}이지!"
            
        elif level == 8:
            a = random.randint(11, 40)
            b = random.randint(2, 5)
            ans = a * b
            title = f"{a} × {b} = ?"
            feedback = f"두 자리 곱셈이야. 정답은 {ans}!"
            
        elif level == 9:
            b = random.randint(2, 5)
            ans = random.randint(11, 25)
            a = b * ans
            title = f"{a} ÷ {b} = ?"
            feedback = f"나머지가 없는 두 자리 나눗셈. 몫은 {ans}!"
            
        elif level == 10:
            if random.choice([True, False]):
                a = random.randint(100, 500)
                b = random.randint(50, 400)
                ans = a + b
                title = f"{a} + {b} = ?"
                feedback = f"백의 자리까지 더하면 {ans}이야!"
            else:
                a = random.randint(5, 15)
                b = random.randint(2, 5)
                c = random.randint(2, 5)
                ans = (a + b) * c
                title = f"({a} + {b}) × {c} = ?"
                feedback = f"괄호 안의 {a+b}를 먼저 계산하고 곱하면 {ans}이지!"

        q_item = {
            "id": f"L{level}_{i}",
            "type": "multiple" if is_multiple else "short",
            "title": title,
            "correctId": None if is_multiple else str(ans),
            "feedback": feedback
        }
        
        if is_multiple:
            opts, correct_id = generate_options(ans)
            q_item["options"] = opts
            q_item["correctId"] = correct_id
            
        questions.append(q_item)
        
    return questions

db_folder = os.path.dirname(os.path.abspath(__file__))

for level in range(1, 11):
    data = generate_questions(level)
    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    js_content = f"window.dbQuestionsLevel{level} = {json_str};\n"
    file_path = os.path.join(db_folder, f"questions_level_{level}.js")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(js_content)

print("SUCCESS: 10 levels of 100 questions generated.")
