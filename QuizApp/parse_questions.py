import os
import json
import re
import random

def parse_chapter(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    sections = re.split(r'\n\d+\.\d+\s+', content)
    if sections[0].strip() == '':
        sections = sections[1:]
    
    questions = []
    
    for section in sections:
        section_lines = section.strip().split('\n')
        section_name = section_lines[0] if section_lines else ""
        
        current_question = None
        current_options = []
        
        for i, line in enumerate(section_lines[1:]):
            line = line.strip()
            if not line:
                continue
            
            answer_match = re.match(r'^Answer:\s*([A-D])$', line)
            if answer_match:
                if current_question and current_options:
                    answer = answer_match.group(1)
                    questions.append({
                        'section': section_name,
                        'question': current_question,
                        'options': current_options,
                        'answer': answer
                    })
                current_question = None
                current_options = []
                continue
            
            question_match = re.match(r'^[^A-D\.].*\?$', line)
            if question_match or (current_question is None and not line.startswith(('A.', 'B.', 'C.', 'D.', 'A:', 'B:', 'C:', 'D:'))):
                if current_question and current_options:
                    questions.append({
                        'section': section_name,
                        'question': current_question,
                        'options': current_options,
                        'answer': None
                    })
                current_question = line
                current_options = []
                continue
            
            option_match = re.match(r'^([A-D])[\.:\)]?\s+(.+)$', line)
            if option_match:
                option_letter, option_text = option_match.groups()
                while len(current_options) < ord(option_letter) - ord('A'):
                    current_options.append("")
                current_options.append(option_text)
    
    return questions

def clean_questions(questions):
    clean_questions = []
    for q in questions:
        if q['answer'] and len(q['options']) >= 3:
            clean_questions.append(q)
    return clean_questions

def process_all_chapters():
    chapters = {}
    
    for filename in os.listdir('.'):
        if filename.startswith('Chapter') and filename.endswith('.md'):
            chapter_num = re.search(r'Chapter\s+(\d+)', filename).group(1)
            questions = parse_chapter(filename)
            questions = clean_questions(questions)
            
            if questions:
                chapters[chapter_num] = questions
                
                output_dir = 'QuizApp/data'
                os.makedirs(output_dir, exist_ok=True)
                
                with open(f'{output_dir}/chapter{chapter_num}.json', 'w', encoding='utf-8') as f:
                    json.dump(questions, f, indent=2)
    
    return chapters

if __name__ == '__main__':
    process_all_chapters() 