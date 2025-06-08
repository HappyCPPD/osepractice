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
    try {
        const response = await fetch('data/chapters.json');
        chapterList = await response.json();
        return chapterList;
    } catch (error) {
        console.error("Error loading chapter list:", error);
        return [];
    }
}

async function loadChapterData(chapterNum) {
    try {
        if (loadedChapters[chapterNum]) return loadedChapters[chapterNum];
        const response = await fetch(`data/chapter${chapterNum}.json`);
        const questions = await response.json();
        loadedChapters[chapterNum] = questions;
        return questions;
    } catch (error) {
        console.error(`Error loading chapter ${chapterNum}:`, error);
        return [];
    }
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
        
        // Don't allow changing answer after selection
        const alreadyAnswered = document.querySelector('.option.correct') || document.querySelector('.option.incorrect');
        if (alreadyAnswered) return;
        
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.classList.remove('selected');
        });
        
        clickedOption.classList.add('selected');
        
        // Immediately check the answer
        const question = currentQuestions[currentQuestionIndex];
        if (!question) return;
        
        const selectedLetter = clickedOption.dataset.letter;
        
        // Create feedback message element if it doesn't exist
        let feedbackEl = document.getElementById('answer-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'answer-feedback';
            feedbackEl.className = 'answer-feedback';
            const optionsContainer = document.getElementById('options-list');
            if (optionsContainer && optionsContainer.parentNode) {
                optionsContainer.parentNode.insertBefore(feedbackEl, optionsContainer.nextSibling);
            }
        }
        
        if (selectedLetter === question.answer) {
            // Correct answer
            correctAnswers++;
            clickedOption.classList.add('correct');
            question.userAnsweredCorrectly = true;
            feedbackEl.textContent = "Correct!";
            feedbackEl.className = 'answer-feedback correct';
        } else {
            // Incorrect answer
            clickedOption.classList.add('incorrect');
            question.userAnsweredCorrectly = false;
            
            // Highlight correct answer
            const correctOption = document.querySelector(`.option[data-letter="${question.answer}"]`);
            if (correctOption) {
                correctOption.classList.add('correct');
                feedbackEl.textContent = `Incorrect. The correct answer is: ${correctOption.querySelector('.option-text').textContent}`;
                feedbackEl.className = 'answer-feedback incorrect';
            }
        }
        
        // Disable the next button for a moment to ensure feedback is seen
        const nextButton = document.getElementById('next-question');
        if (nextButton) {
            nextButton.disabled = true;
            // Enable after a short delay
            setTimeout(() => {
                nextButton.disabled = false;
            }, 1000); // 1 second delay
        }
    });
});

async function loadChapterSelections() {
    try {
        const chaptersContainer = document.getElementById('chapters-container');
        if (!chaptersContainer) {
            console.error("Chapters container not found");
            return;
        }
        
        chaptersContainer.innerHTML = '';
        
        if (chapterList.length === 0) {
            await loadChapterList();
        }
        
        for (const chapter of chapterList) {
            if (!chapter || !chapter.num) continue;
            
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
            label.textContent = `Chapter ${chapter.num}: ${chapter.title || 'Untitled'} (${questions.length} questions)`;
            
            chapterDiv.appendChild(checkbox);
            chapterDiv.appendChild(label);
            chaptersContainer.appendChild(chapterDiv);
        }
        
        updateSelectedCount();
    } catch (error) {
        console.error("Error loading chapter selections:", error);
    }
}

async function updateSelectedCount() {
    try {
        const checkboxes = document.querySelectorAll('.chapter-checkbox:checked');
        selectedChapters = Array.from(checkboxes).map(cb => cb.value);
        
        let totalQuestions = 0;
        for (const chapterNum of selectedChapters) {
            const questions = await loadChapterData(chapterNum);
            totalQuestions += questions.length;
        }
        
        const selectedCountElement = document.getElementById('selected-count');
        if (selectedCountElement) {
            selectedCountElement.textContent = `${selectedChapters.length} chapters selected (${totalQuestions} questions available)`;
        }
        
        const questionCountInput = document.getElementById('question-count');
        if (questionCountInput) {
            questionCountInput.max = totalQuestions;
            if (parseInt(questionCountInput.value) > totalQuestions) {
                questionCountInput.value = totalQuestions;
            }
        }
        
        const startQuizButton = document.getElementById('start-quiz');
        if (startQuizButton) {
            startQuizButton.disabled = selectedChapters.length === 0;
        }
    } catch (error) {
        console.error("Error updating selected count:", error);
    }
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
    if (!input) return;
    
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
    try {
        const questionCount = parseInt(document.getElementById('question-count').value);
        if (isNaN(questionCount) || questionCount < 1) {
            alert('Please enter a valid number of questions.');
            return;
        }
        if (selectedChapters.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }
        
        // Ensure chapterList is loaded
        if (chapterList.length === 0) {
            await loadChapterList();
        }
        
        // Gather all questions from selected chapters
        let allQuestions = [];
        for (const chapterNum of selectedChapters) {
            const questions = await loadChapterData(chapterNum);
            allQuestions = allQuestions.concat(questions.map(q => ({ ...q, chapterNum })));
        }
        
        // Check if we have questions
        if (allQuestions.length === 0) {
            alert('No questions available. Please check your chapter data.');
            return;
        }
        
        // Shuffle and select requested number of questions
        shuffleArray(allQuestions);
        currentQuestions = allQuestions.slice(0, questionCount);
        
        // Reset quiz state
        currentQuestionIndex = 0;
        correctAnswers = 0;
        
        // Show quiz interface
        const quizSetup = document.getElementById('quiz-setup');
        const quizInterface = document.getElementById('quiz-interface');
        
        if (quizSetup) quizSetup.classList.add('hidden');
        if (quizInterface) quizInterface.classList.remove('hidden');
        
        // Show first question
        showQuestion();
        
        // Start timer if enabled
        const timerEnabled = document.getElementById('timer-enabled')?.checked;
        if (timerEnabled) {
            const timerMinutes = parseInt(document.getElementById('timer-minutes')?.value || '0');
            if (!isNaN(timerMinutes) && timerMinutes > 0) {
                timeLeft = timerMinutes * 60;
                startTimer();
            }
        }
        
        quizActive = true;
    } catch (error) {
        console.error("Error starting quiz:", error);
        alert('An error occurred when starting the quiz. Please try again.');
    }
}

function showQuestion() {
    try {
        // Make sure we have questions and valid index
        if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= currentQuestions.length) {
            console.error("Invalid question state:", { 
                questionCount: currentQuestions?.length || 0, 
                index: currentQuestionIndex 
            });
            return;
        }
        
        const question = currentQuestions[currentQuestionIndex];
        const questionNum = currentQuestionIndex + 1;
        const totalQuestions = currentQuestions.length;
        
        // Update progress
        const progressElement = document.getElementById('question-progress');
        const progressBar = document.getElementById('progress-bar');
        
        if (progressElement) {
            progressElement.textContent = `Question ${questionNum} of ${totalQuestions}`;
        }
        
        if (progressBar) {
            progressBar.style.width = `${(questionNum / totalQuestions) * 100}%`;
        }
        
        // Show chapter info
        const currentChapterElement = document.getElementById('current-chapter');
        if (currentChapterElement) {
            const foundChapter = chapterList.find(c => c && c.num === question.chapterNum);
            currentChapterElement.textContent = `Chapter ${question.chapterNum}: ${foundChapter ? foundChapter.title : 'Unknown'}`;
        }
        
        // Show question
        const questionTextElement = document.getElementById('question-text');
        if (questionTextElement) {
            questionTextElement.textContent = question.question || "Question not available";
        }
        
        // Reset any existing feedback
        const feedbackElement = document.getElementById('answer-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = '';
            feedbackElement.className = 'answer-feedback hidden';
        }
        
        // Show options
        const optionsList = document.getElementById('options-list');
        if (!optionsList) return;
        
        optionsList.innerHTML = '';
        
        // Make sure options exist
        if (!question.options || !Array.isArray(question.options)) {
            console.error("Question has no options:", question);
            return;
        }
        
        // Create array of options with their letters
        const optionsWithLetters = question.options.map((option, index) => ({
            text: option,
            letter: String.fromCharCode(65 + index) // A, B, C, D
        }));
        
        // Shuffle the options
        shuffleArray(optionsWithLetters);
        
        // Find the new position of the correct answer
        const correctOption = optionsWithLetters.find(opt => opt.letter === question.answer);
        if (correctOption) {
            question.answer = correctOption.letter;
        }
        
        // Display the shuffled options
        optionsWithLetters.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.dataset.letter = option.letter;
            
            const letterSpan = document.createElement('span');
            letterSpan.className = 'option-letter';
            letterSpan.textContent = option.letter;
            
            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';
            textSpan.textContent = option.text;
            
            optionDiv.appendChild(letterSpan);
            optionDiv.appendChild(textSpan);
            optionsList.appendChild(optionDiv);
        });
        
        // Reset button states
        const nextButton = document.getElementById('next-question');
        const finishButton = document.getElementById('finish-quiz');
        
        if (nextButton) {
            nextButton.disabled = true;
            nextButton.classList.remove('hidden');
        }
        
        if (finishButton) {
            finishButton.classList.add('hidden');
        }
        
        // Show finish button on last question
        if (currentQuestionIndex === currentQuestions.length - 1) {
            if (nextButton) nextButton.classList.add('hidden');
            if (finishButton) finishButton.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error showing question:", error);
    }
}

function nextQuestion() {
    // No need to check answer here anymore since it's checked immediately on selection
    
    // Move to next question
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        finishQuiz();
    }
}

function checkAnswer() {
    // This function is kept for compatibility but is no longer used directly anymore
    const selectedOption = document.querySelector('.option.selected');
    if (!selectedOption) return;
    
    // If already checked (has correct/incorrect class), just return
    if (selectedOption.classList.contains('correct') || selectedOption.classList.contains('incorrect')) {
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    if (!question) return;
    
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
    try {
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
        const quizInterface = document.getElementById('quiz-interface');
        const resultsScreen = document.getElementById('results-screen');
        
        if (quizInterface) quizInterface.classList.add('hidden');
        if (resultsScreen) resultsScreen.classList.remove('hidden');
        
        const resultScore = document.getElementById('result-score');
        if (resultScore) {
            resultScore.textContent = `${correctAnswers} / ${totalQuestions} (${percentage}%)`;
        }
        
        // Determine pass/fail (70% passing threshold)
        const resultStatus = document.getElementById('result-status');
        if (resultStatus) {
            if (percentage >= 70) {
                resultStatus.textContent = 'PASS';
                resultStatus.className = 'pass';
            } else {
                resultStatus.textContent = 'FAIL';
                resultStatus.className = 'fail';
            }
        }
        
        // Generate review list
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;
        
        reviewList.innerHTML = '';
        
        currentQuestions.forEach((question, index) => {
            if (!question) return;
            
            const isCorrect = question.userAnsweredCorrectly;
            
            const questionDiv = document.createElement('div');
            questionDiv.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            const questionText = document.createElement('div');
            questionText.className = 'review-question';
            questionText.textContent = `${index + 1}. ${question.question || 'Question not available'}`;
            
            const chapterInfo = document.createElement('div');
            chapterInfo.className = 'review-chapter';
            chapterInfo.textContent = `Chapter ${question.chapterNum || 'Unknown'}`;
            
            questionDiv.appendChild(questionText);
            questionDiv.appendChild(chapterInfo);
            reviewList.appendChild(questionDiv);
        });
        
        quizActive = false;
    } catch (error) {
        console.error("Error finishing quiz:", error);
    }
}

function startTimer() {
    try {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.classList.remove('hidden');
        
        updateTimerDisplay();
        
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                finishQuiz();
            }
        }, 1000);
    } catch (error) {
        console.error("Error starting timer:", error);
    }
}

function updateTimerDisplay() {
    try {
        const timerValue = document.getElementById('timer-value');
        if (!timerValue) return;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error("Error updating timer display:", error);
    }
}

function resetQuiz() {
    currentQuestions = [];
    currentQuestionIndex = 0;
    correctAnswers = 0;
    clearInterval(timer);
    quizActive = false;
}

function shuffleArray(array) {
    if (!array || !Array.isArray(array)) return;
    
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
} 