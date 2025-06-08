let selectedChapters = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let timer;
let timeLeft = 0;
let quizActive = false;

// Store loaded chapter data
let loadedChapters = {};

let chapterList = [];

async function loadChapterList() {
    const response = await fetch('data/chapters.json');
    chapterList = await response.json();
}

async function loadChapterData(chapterNum) {
    if (loadedChapters[chapterNum]) return loadedChapters[chapterNum];
    const response = await fetch(`data/chapter${chapterNum}.json`);
    const questions = await response.json();
    loadedChapters[chapterNum] = questions;
    return questions;
}

document.addEventListener('DOMContentLoaded', () => {
    loadChapterSelections();
    
    document.getElementById('start-quiz').addEventListener('click', startQuiz);
    document.getElementById('next-question').addEventListener('click', nextQuestion);
    document.getElementById('finish-quiz').addEventListener('click', finishQuiz);
    document.getElementById('restart-quiz').addEventListener('click', () => {
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('quiz-setup').classList.remove('hidden');
        resetQuiz();
    });
    
    document.getElementById('toggle-all').addEventListener('click', toggleAllChapters);
    document.getElementById('question-count').addEventListener('input', validateQuestionCount);
    
    // Set up option selection
    const optionsList = document.getElementById('options-list');
    optionsList.addEventListener('click', (e) => {
        if (!quizActive) return;
        
        const clickedOption = e.target.closest('.option');
        if (!clickedOption) return;
        
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.remove('selected');
            option.classList.remove('correct');
            option.classList.remove('incorrect');
        });
        
        clickedOption.classList.add('selected');
        document.getElementById('next-question').disabled = false;
    });
});

async function loadChapterSelections() {
    const chaptersContainer = document.getElementById('chapters-container');
    chaptersContainer.innerHTML = '';
    if (chapterList.length === 0) {
        await loadChapterList();
    }
    for (const chapter of chapterList) {
        const questions = await loadChapterData(chapter.num);
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-selection';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `chapter-${chapter.num}`;
        checkbox.value = chapter.num;
        checkbox.className = 'chapter-checkbox';
        checkbox.addEventListener('change', updateSelectedCount);
        const label = document.createElement('label');
        label.htmlFor = `chapter-${chapter.num}`;
        label.textContent = `Chapter ${chapter.num}: ${chapter.title} (${questions.length} questions)`;
        chapterDiv.appendChild(checkbox);
        chapterDiv.appendChild(label);
        chaptersContainer.appendChild(chapterDiv);
    }
    updateSelectedCount();
}

async function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.chapter-checkbox:checked');
    selectedChapters = Array.from(checkboxes).map(cb => cb.value);
    let totalQuestions = 0;
    for (const chapterNum of selectedChapters) {
        const questions = await loadChapterData(chapterNum);
        totalQuestions += questions.length;
    }
    document.getElementById('selected-count').textContent = `${selectedChapters.length} chapters selected (${totalQuestions} questions available)`;
    const questionCountInput = document.getElementById('question-count');
    questionCountInput.max = totalQuestions;
    if (parseInt(questionCountInput.value) > totalQuestions) {
        questionCountInput.value = totalQuestions;
    }
    document.getElementById('start-quiz').disabled = selectedChapters.length === 0;
}

function toggleAllChapters() {
    const checkboxes = document.querySelectorAll('.chapter-checkbox');
    const allSelected = selectedChapters.length === checkboxes.length;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allSelected;
    });
    
    updateSelectedCount();
}

function validateQuestionCount() {
    const input = document.getElementById('question-count');
    let value = parseInt(input.value);
    
    if (isNaN(value) || value < 1) {
        input.value = 1;
    }
    
    const maxQuestions = parseInt(input.max);
    if (value > maxQuestions) {
        input.value = maxQuestions;
    }
}

async function startQuiz() {
    const questionCount = parseInt(document.getElementById('question-count').value);
    if (isNaN(questionCount) || questionCount < 1) {
        alert('Please enter a valid number of questions.');
        return;
    }
    if (selectedChapters.length === 0) {
        alert('Please select at least one chapter.');
        return;
    }
    // Gather all questions from selected chapters
    let allQuestions = [];
    for (const chapterNum of selectedChapters) {
        const questions = await loadChapterData(chapterNum);
        allQuestions = allQuestions.concat(questions.map(q => ({ ...q, chapterNum }))); 
    }
    // Shuffle and select requested number of questions
    shuffleArray(allQuestions);
    currentQuestions = allQuestions.slice(0, questionCount);
    // Reset quiz state
    currentQuestionIndex = 0;
    correctAnswers = 0;
    // Show quiz interface
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-interface').classList.remove('hidden');
    // Show first question
    showQuestion();
    // Start timer if enabled
    const timerEnabled = document.getElementById('timer-enabled').checked;
    if (timerEnabled) {
        const timerMinutes = parseInt(document.getElementById('timer-minutes').value);
        if (!isNaN(timerMinutes) && timerMinutes > 0) {
            timeLeft = timerMinutes * 60;
            startTimer();
        }
    }
    quizActive = true;
}

function showQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const questionNum = currentQuestionIndex + 1;
    const totalQuestions = currentQuestions.length;
    
    // Update progress
    document.getElementById('question-progress').textContent = `Question ${questionNum} of ${totalQuestions}`;
    document.getElementById('progress-bar').style.width = `${(questionNum / totalQuestions) * 100}%`;
    
    // Show chapter info
    document.getElementById('current-chapter').textContent = `Chapter ${question.chapterNum}: ${chapters[question.chapterNum].title}`;
    
    // Show question
    document.getElementById('question-text').textContent = question.question;
    
    // Show options
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    const letters = ['A', 'B', 'C', 'D'];
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.letter = letters[index];
        
        const letterSpan = document.createElement('span');
        letterSpan.className = 'option-letter';
        letterSpan.textContent = letters[index];
        
        const textSpan = document.createElement('span');
        textSpan.className = 'option-text';
        textSpan.textContent = option;
        
        optionDiv.appendChild(letterSpan);
        optionDiv.appendChild(textSpan);
        optionsList.appendChild(optionDiv);
    });
    
    // Reset button states
    document.getElementById('next-question').disabled = true;
    document.getElementById('finish-quiz').classList.add('hidden');
    
    // Show finish button on last question
    if (currentQuestionIndex === currentQuestions.length - 1) {
        document.getElementById('next-question').classList.add('hidden');
        document.getElementById('finish-quiz').classList.remove('hidden');
    } else {
        document.getElementById('next-question').classList.remove('hidden');
    }
}

function nextQuestion() {
    // Check answer
    checkAnswer();
    
    // Move to next question
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        finishQuiz();
    }
}

function checkAnswer() {
    const selectedOption = document.querySelector('.option.selected');
    if (!selectedOption) return;
    
    const question = currentQuestions[currentQuestionIndex];
    const selectedLetter = selectedOption.dataset.letter;
    
    if (selectedLetter === question.answer) {
        correctAnswers++;
        selectedOption.classList.add('correct');
        question.userAnsweredCorrectly = true;
    } else {
        selectedOption.classList.add('incorrect');
        question.userAnsweredCorrectly = false;
        // Highlight correct answer
        const correctOption = document.querySelector(`.option[data-letter="${question.answer}"]`);
        if (correctOption) {
            correctOption.classList.add('correct');
        }
    }
}

function finishQuiz() {
    // Check answer for the last question if not already checked
    const selectedOption = document.querySelector('.option.selected');
    if (selectedOption && !selectedOption.classList.contains('correct') && !selectedOption.classList.contains('incorrect')) {
        checkAnswer();
    }
    
    // Stop timer
    clearInterval(timer);
    
    // Calculate results
    const totalQuestions = currentQuestions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Show results
    document.getElementById('quiz-interface').classList.add('hidden');
    document.getElementById('results-screen').classList.remove('hidden');
    
    document.getElementById('result-score').textContent = `${correctAnswers} / ${totalQuestions} (${percentage}%)`;
    
    // Determine pass/fail (70% passing threshold)
    const resultStatus = document.getElementById('result-status');
    if (percentage >= 70) {
        resultStatus.textContent = 'PASS';
        resultStatus.className = 'pass';
    } else {
        resultStatus.textContent = 'FAIL';
        resultStatus.className = 'fail';
    }
    
    // Generate review list
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const isCorrect = currentQuestions[index].userAnsweredCorrectly;
        
        const questionDiv = document.createElement('div');
        questionDiv.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        const questionText = document.createElement('div');
        questionText.className = 'review-question';
        questionText.textContent = `${index + 1}. ${question.question}`;
        
        const chapterInfo = document.createElement('div');
        chapterInfo.className = 'review-chapter';
        chapterInfo.textContent = `Chapter ${question.chapterNum}`;
        
        questionDiv.appendChild(questionText);
        questionDiv.appendChild(chapterInfo);
        reviewList.appendChild(questionDiv);
    });
    
    quizActive = false;
}

function startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.classList.remove('hidden');
    
    updateTimerDisplay();
    
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer-value').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function resetQuiz() {
    currentQuestions = [];
    currentQuestionIndex = 0;
    correctAnswers = 0;
    clearInterval(timer);
    quizActive = false;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
} 