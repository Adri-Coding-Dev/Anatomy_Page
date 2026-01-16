class AnatomyQuiz {
    constructor() {
        this.questions = [];
        this.currentQuestion = 0;
        this.score = 0;
        this.totalQuestions = 20;
        this.quizData = [];
        this.userAnswers = [];
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.imageCache = new Map();
        
        // Elementos DOM
        this.elements = {
            startScreen: document.getElementById('start-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            summaryScreen: document.getElementById('summary-screen'),
            startBtn: document.getElementById('start-btn'),
            anatomyImage: document.getElementById('anatomy-image'),
            highlightCanvas: document.getElementById('highlight-canvas'),
            answerInput: document.getElementById('answer-input'),
            submitBtn: document.getElementById('submit-btn'),
            feedback: document.getElementById('feedback'),
            feedbackText: document.getElementById('feedback-text'),
            suggestions: document.getElementById('suggestions'),
            nextBtn: document.getElementById('next-btn'),
            prevBtn: document.getElementById('prev-btn'),
            progress: document.getElementById('progress'),
            scoreElement: document.getElementById('score'),
            timer: document.getElementById('timer'),
            imageName: document.getElementById('image-name'),
            hintText: document.getElementById('hint-text'),
            skipBtn: document.getElementById('skip-btn'),
            restartBtn: document.getElementById('restart-btn'),
            reviewBtn: document.getElementById('review-btn'),
            downloadBtn: document.getElementById('download-btn'),
            correctCount: document.getElementById('correct-count'),
            incorrectCount: document.getElementById('incorrect-count'),
            skippedCount: document.getElementById('skipped-count'),
            totalTime: document.getElementById('total-time'),
            accuracyRate: document.getElementById('accuracy-rate'),
            questionsPerMinute: document.getElementById('questions-per-minute'),
            finalGrade: document.getElementById('final-grade'),
            finalScore: document.getElementById('final-score'),
            answersList: document.getElementById('answers-list'),
            scoreCircle: document.getElementById('score-circle'),
            clearStorage: document.getElementById('clear-storage'),
            infoModal: document.getElementById('info-modal'),
            closeModal: document.querySelector('.close-modal'),
            aboutLink: document.getElementById('about-link'),
            helpLink: document.getElementById('help-link'),
            numQuestions: document.getElementById('num-questions'),
            quizMode: document.getElementById('quiz-mode')
        };
        
        this.init();
    }
    
    async init() {
        await this.loadQuizData();
        this.setupEventListeners();
        this.loadStatistics();
        this.updateStatsDisplay();
    }
    
    async loadQuizData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error('No se pudo cargar data.json');
            }
            this.quizData = await response.json();
            
            console.log('Datos cargados:', this.quizData);
            
            document.getElementById('total-images').textContent = `${this.quizData.length} imágenes`;
            const totalParts = this.quizData.reduce((acc, item) => acc + item.partes.length, 0);
            document.getElementById('total-parts').textContent = `${totalParts} partes`;
            
        } catch (error) {
            console.error('Error cargando datos:', error);
            
            // Datos de ejemplo
            this.quizData = [
                {
                    imagen: 'images/sin_nombres/1.png',
                    sistema: 'esqueletico',
                    region: 'cabeza',
                    partes: [
                        {
                            nombre: 'Hueso Parietal',
                            x: 468,
                            y: 375,
                            width: 100,
                            height: 100,
                            hint: 'Hueso par del cráneo que forma los laterales y techo'
                        }
                    ]
                }
            ];
            
            document.getElementById('total-images').textContent = `${this.quizData.length} imágenes`;
            document.getElementById('total-parts').textContent = `${this.quizData[0].partes.length} partes`;
            
            console.log('Usando datos de ejemplo.');
        }
    }
    
    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.startQuiz());
        this.elements.submitBtn.addEventListener('click', () => this.checkAnswer());
        this.elements.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.elements.prevBtn.addEventListener('click', () => this.prevQuestion());
        this.elements.skipBtn.addEventListener('click', () => this.skipQuestion());
        this.elements.restartBtn.addEventListener('click', () => this.restartQuiz());
        this.elements.reviewBtn.addEventListener('click', () => this.reviewMistakes());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadResults());
        this.elements.clearStorage.addEventListener('click', () => this.clearStorage());
        this.elements.aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.elements.infoModal.style.display = 'block';
        });
        this.elements.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.elements.infoModal.style.display = 'block';
        });
        this.elements.closeModal.addEventListener('click', () => {
            this.elements.infoModal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.infoModal) {
                this.elements.infoModal.style.display = 'none';
            }
        });
        
        // Redibujar el cuadrado cuando cambie el tamaño de la ventana
        window.addEventListener('resize', () => {
            if (this.currentQuestion < this.questions.length) {
                this.drawHighlight(this.questions[this.currentQuestion]);
            }
        });
    }
    
    startQuiz() {
        this.totalQuestions = parseInt(this.elements.numQuestions.value);
        this.generateQuestions();
        
        if (this.questions.length === 0) {
            alert('No hay suficientes preguntas disponibles. Verifica el archivo data.json.');
            return;
        }
        
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.elapsedTime = 0;
        this.imageCache.clear();
        
        this.elements.startScreen.classList.remove('active');
        this.elements.quizScreen.classList.add('active');
        
        this.startTime = Date.now();
        this.startTimer();
        
        this.showQuestion();
    }
    
    generateQuestions() {
        this.questions = [];
        const mode = this.elements.quizMode.value;
        
        let allParts = [];
        this.quizData.forEach(imageData => {
            if (imageData && imageData.partes && Array.isArray(imageData.partes)) {
                imageData.partes.forEach(part => {
                    allParts.push({
                        image: imageData.imagen,
                        sistema: imageData.sistema || 'general',
                        region: imageData.region || 'general',
                        ...part
                    });
                });
            }
        });
        
        let filteredParts = allParts;
        if (mode === 'system') {
            const systems = [...new Set(allParts.map(p => p.sistema))];
            const selectedSystem = systems[Math.floor(Math.random() * systems.length)];
            filteredParts = allParts.filter(p => p.sistema === selectedSystem);
        } else if (mode === 'region') {
            const regions = [...new Set(allParts.map(p => p.region))];
            const selectedRegion = regions[Math.floor(Math.random() * regions.length)];
            filteredParts = allParts.filter(p => p.region === selectedRegion);
        }
        
        const numQuestions = Math.min(this.totalQuestions, filteredParts.length);
        if (numQuestions === 0) {
            console.error('No hay partes disponibles para generar preguntas');
            return;
        }
        
        const shuffled = [...filteredParts].sort(() => Math.random() - 0.5);
        this.questions = shuffled.slice(0, numQuestions);
    }
    
    showQuestion() {
        if (this.currentQuestion >= this.questions.length) {
            this.endQuiz();
            return;
        }
        
        const question = this.questions[this.currentQuestion];
        const img = this.elements.anatomyImage;
        
        // Forzar recarga de la imagen para evitar problemas de cache
        img.src = question.image + '?t=' + Date.now();
        img.alt = `Imagen de anatomía - ${question.nombre}`;
        
        const imageName = question.image.split('/').pop().split('.')[0];
        this.elements.imageName.textContent = `Imagen: ${imageName.replace(/_/g, ' ').replace(/-/g, ' ')}`;
        this.elements.hintText.textContent = question.hint || '';
        
        this.elements.feedback.className = 'feedback';
        this.elements.feedback.style.display = 'none';
        this.elements.suggestions.innerHTML = '';
        
        this.elements.answerInput.value = '';
        this.elements.answerInput.focus();
        
        this.elements.progress.textContent = 
            `Pregunta: ${this.currentQuestion + 1}/${this.questions.length}`;
        
        const currentScore = this.currentQuestion > 0 ? 
            Math.round((this.score / this.currentQuestion) * 100) : 0;
        this.elements.scoreElement.textContent = 
            `Puntuación: ${currentScore}%`;
        
        this.elements.prevBtn.disabled = this.currentQuestion === 0;
        this.elements.nextBtn.disabled = this.currentQuestion === this.questions.length - 1;
        
        if (this.currentQuestion === 0 && !localStorage.getItem('tutorialShown')) {
            setTimeout(() => {
                this.showTutorial();
            }, 1000);
        }
        
        // Configurar el evento de carga de imagen
        const onImageLoad = () => {
            this.drawHighlight(question);
        };
        
        if (img.complete) {
            onImageLoad();
        } else {
            img.addEventListener('load', onImageLoad, { once: true });
        }
    }
    
    drawHighlight(part) {
        const canvas = this.elements.highlightCanvas;
        const ctx = canvas.getContext('2d');
        const img = this.elements.anatomyImage;
        
        if (!img.complete || img.naturalWidth === 0) {
            console.log('Esperando a que cargue la imagen...');
            return;
        }
        
        // Obtener el tamaño NATURAL de la imagen (tamaño real del archivo)
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        // Obtener el tamaño de VISUALIZACIÓN de la imagen (en pantalla)
        const displayWidth = img.width;
        const displayHeight = img.height;
        
        console.log(`Imagen natural: ${naturalWidth}x${naturalHeight}`);
        console.log(`Imagen en pantalla: ${displayWidth}x${displayHeight}`);
        console.log(`Coordenadas originales: Centro (${part.x}, ${part.y}) tamaño: ${part.width}x${part.height}`);
        
        // Calcular factores de escala
        const scaleX = displayWidth / naturalWidth;
        const scaleY = displayHeight / naturalHeight;
        
        console.log(`Factores de escala: X=${scaleX}, Y=${scaleY}`);
        
        // IMPORTANTE: Las coordenadas (x, y) son el CENTRO del cuadrado
        // Aplicar escala al centro
        const centerX = part.x * scaleX;
        const centerY = part.y * scaleY;
        const width = part.width * scaleX;
        const height = part.height * scaleY;
        
        // Calcular la esquina superior izquierda para dibujar (ya que ctx.strokeRect usa esquina superior izquierda)
        const x = centerX - (width / 2);
        const y = centerY - (height / 2);
        
        console.log(`Centro escalado: (${centerX}, ${centerY})`);
        console.log(`Tamaño escalado: ${width}x${height}`);
        console.log(`Esquina superior izquierda para dibujar: (${x}, ${y})`);
        
        // Ajustar el tamaño del canvas al tamaño de visualización de la imagen
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Posicionar el canvas exactamente sobre la imagen
        const imgRect = img.getBoundingClientRect();
        const containerRect = img.parentElement.getBoundingClientRect();
        
        canvas.style.position = 'absolute';
        canvas.style.left = (imgRect.left - containerRect.left) + 'px';
        canvas.style.top = (imgRect.top - containerRect.top) + 'px';
        
        // Limpiar canvas completamente
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar un cuadrado rojo SÓLIDO (borde rojo intenso)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        
        // Para mejor visibilidad, también dibujar un relleno semitransparente
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        console.log(`Cuadrado dibujado en pantalla: Centro (${centerX}, ${centerY}) ${width}x${height}`);
    }
    
    showTutorial() {
        const tutorial = document.createElement('div');
        tutorial.className = 'tutorial';
        tutorial.innerHTML = `
            <div class="tutorial-content">
                <h3><i class="fas fa-graduation-cap"></i> Cómo funciona</h3>
                <p>El área marcada con el recuadro rojo es la parte anatómica que debes identificar.</p>
                <p>Las coordenadas (x, y) son el CENTRO del cuadrado en la imagen original.</p>
                <p>Escribe el nombre en el campo de texto y presiona "Verificar" o la tecla Enter.</p>
                <button class="btn-secondary" id="close-tutorial">Entendido</button>
            </div>
        `;
        
        document.querySelector('.question-container').appendChild(tutorial);
        
        document.getElementById('close-tutorial').addEventListener('click', () => {
            tutorial.remove();
            localStorage.setItem('tutorialShown', 'true');
        });
    }
    
    checkAnswer() {
        const userAnswer = this.elements.answerInput.value.trim();
        const correctAnswer = this.questions[this.currentQuestion].nombre;
        
        if (!userAnswer) {
            alert('Por favor, escribe una respuesta.');
            return;
        }
        
        const normalizedUser = this.normalizeText(userAnswer);
        const normalizedCorrect = this.normalizeText(correctAnswer);
        
        const isCorrect = normalizedUser === normalizedCorrect;
        
        this.userAnswers.push({
            question: this.questions[this.currentQuestion],
            userAnswer,
            isCorrect,
            skipped: false,
            time: Date.now() - this.startTime
        });
        
        if (isCorrect) {
            this.score++;
        }
        
        this.showFeedback(isCorrect, correctAnswer);
        this.saveProgress();
    }
    
    showFeedback(isCorrect, correctAnswer) {
        const feedback = this.elements.feedback;
        const feedbackText = this.elements.feedbackText;
        
        if (isCorrect) {
            feedback.className = 'feedback correct';
            feedbackText.innerHTML = `<i class="fas fa-check"></i> ¡Correcto! "${correctAnswer}" es la respuesta correcta.`;
        } else {
            feedback.className = 'feedback incorrect';
            feedbackText.innerHTML = `<i class="fas fa-times"></i> Incorrecto. La respuesta correcta es: <strong>${correctAnswer}</strong>`;
            this.showSuggestions(correctAnswer);
        }
        
        feedback.style.display = 'block';
        
        this.elements.submitBtn.disabled = true;
        setTimeout(() => {
            this.elements.submitBtn.disabled = false;
            this.nextQuestion();
        }, 4000);
    }
    
    showSuggestions(correctAnswer) {
        const currentQuestion = this.questions[this.currentQuestion];
        const suggestions = [];
        
        this.quizData.forEach(imageData => {
            imageData.partes.forEach(part => {
                if (part.nombre.toLowerCase() !== correctAnswer.toLowerCase() &&
                    this.getSimilarity(part.nombre, correctAnswer) > 0.4) {
                    suggestions.push(part);
                }
            });
        });
        
        const topSuggestions = suggestions.slice(0, 3);
        
        if (topSuggestions.length > 0) {
            const suggestionsDiv = this.elements.suggestions;
            suggestionsDiv.innerHTML = '<p style="margin-bottom: 5px; font-size: 14px;">¿Quizás quisiste decir?</p>';
            
            topSuggestions.forEach(suggestion => {
                const span = document.createElement('span');
                span.className = 'suggestion';
                span.textContent = suggestion.nombre;
                span.addEventListener('click', () => {
                    this.elements.answerInput.value = suggestion.nombre;
                });
                suggestionsDiv.appendChild(span);
            });
        }
    }
    
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    getSimilarity(str1, str2) {
        const s1 = this.normalizeText(str1);
        const s2 = this.normalizeText(str2);
        
        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;
        
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.startsWith(shorter)) {
            return (shorter.length / longer.length) * 0.8;
        }
        
        const distance = this.editDistance(s1, s2);
        return (longer.length - distance) / longer.length;
    }
    
    editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
    
    nextQuestion() {
        this.currentQuestion++;
        this.showQuestion();
    }
    
    prevQuestion() {
        if (this.currentQuestion > 0) {
            if (this.userAnswers.length > this.currentQuestion) {
                this.userAnswers.pop();
            }
            this.currentQuestion--;
            this.showQuestion();
        }
    }
    
    skipQuestion() {
        this.userAnswers.push({
            question: this.questions[this.currentQuestion],
            userAnswer: '(saltada)',
            isCorrect: false,
            skipped: true,
            time: Date.now() - this.startTime
        });
        
        this.nextQuestion();
    }
    
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            const minutes = Math.floor(this.elapsedTime / 60000);
            const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
            this.elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    endQuiz() {
        clearInterval(this.timerInterval);
        
        this.elements.quizScreen.classList.remove('active');
        this.elements.summaryScreen.classList.add('active');
        
        const correct = this.userAnswers.filter(a => a.isCorrect).length;
        const incorrect = this.userAnswers.filter(a => !a.isCorrect && !a.skipped).length;
        const skipped = this.userAnswers.filter(a => a.skipped).length;
        const total = this.questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        const accuracyRate = total > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
        const minutes = this.elapsedTime / 60000;
        const questionsPerMinute = minutes > 0 ? (total / minutes).toFixed(1) : "0";
        
        this.elements.correctCount.textContent = correct;
        this.elements.incorrectCount.textContent = incorrect;
        this.elements.skippedCount.textContent = skipped;
        this.elements.totalTime.textContent = this.formatTime(this.elapsedTime);
        this.elements.finalScore.textContent = percentage;
        this.elements.accuracyRate.textContent = `${accuracyRate}%`;
        this.elements.questionsPerMinute.textContent = questionsPerMinute;
        this.elements.finalGrade.textContent = `${correct}/${total}`;
        
        const circle = this.elements.scoreCircle;
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
            circle.style.transition = 'stroke-dashoffset 1.5s ease';
        }, 100);
        
        this.displayAnswers();
        this.updateBestScore(percentage);
    }
    
    displayAnswers() {
        const answersList = this.elements.answersList;
        answersList.innerHTML = '';
        
        this.userAnswers.forEach((answer, index) => {
            const div = document.createElement('div');
            let statusClass = '';
            let statusIcon = '';
            
            if (answer.skipped) {
                statusClass = 'skipped';
                statusIcon = '<i class="fas fa-forward" style="color: #6c757d;"></i>';
            } else if (answer.isCorrect) {
                statusClass = 'correct';
                statusIcon = '<i class="fas fa-check-circle" style="color: #28a745;"></i>';
            } else {
                statusClass = 'incorrect';
                statusIcon = '<i class="fas fa-times-circle" style="color: #dc3545;"></i>';
            }
            
            div.className = `answer-item ${statusClass}`;
            
            div.innerHTML = `
                <div class="answer-info">
                    <span class="question-number">Pregunta ${index + 1}</span>
                    <span class="question-text">${answer.question.nombre}</span>
                    <span class="user-answer">Tu respuesta: <strong>${answer.userAnswer}</strong></span>
                </div>
                <div class="answer-status">
                    ${statusIcon}
                </div>
            `;
            
            answersList.appendChild(div);
        });
    }
    
    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    restartQuiz() {
        this.elements.summaryScreen.classList.remove('active');
        this.elements.startScreen.classList.add('active');
    }
    
    reviewMistakes() {
        const mistakes = this.userAnswers
            .filter(answer => !answer.isCorrect && !answer.skipped)
            .map(answer => answer.question);
        
        if (mistakes.length === 0) {
            alert('¡No tienes errores que repasar!');
            return;
        }
        
        this.questions = mistakes;
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.startTime = Date.now();
        
        this.elements.summaryScreen.classList.remove('active');
        this.elements.quizScreen.classList.add('active');
        
        this.startTimer();
        this.showQuestion();
    }
    
    downloadResults() {
        const correct = this.userAnswers.filter(a => a.isCorrect).length;
        const incorrect = this.userAnswers.filter(a => !a.isCorrect && !a.skipped).length;
        const skipped = this.userAnswers.filter(a => a.skipped).length;
        const total = this.questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        const results = {
            fecha: new Date().toISOString(),
            totalPreguntas: total,
            respuestasCorrectas: correct,
            respuestasIncorrectas: incorrect,
            preguntasSaltadas: skipped,
            porcentaje: percentage,
            nota: `${correct}/${total}`,
            tiempo: this.formatTime(this.elapsedTime),
            respuestas: this.userAnswers.map(answer => ({
                pregunta: answer.question.nombre,
                respuestaUsuario: answer.userAnswer,
                correcta: answer.isCorrect,
                saltada: answer.skipped
            }))
        };
        
        const dataStr = JSON.stringify(results, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `resultados-anatomia-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    saveProgress() {
        const progress = {
            lastScore: this.score,
            totalQuestions: this.questions.length,
            date: new Date().toISOString(),
            userAnswers: this.userAnswers
        };
        
        localStorage.setItem('anatomyQuizProgress', JSON.stringify(progress));
    }
    
    loadStatistics() {
        const stats = JSON.parse(localStorage.getItem('anatomyQuizStats')) || {
            bestScore: 0,
            totalQuizzes: 0,
            totalCorrect: 0,
            totalQuestions: 0
        };
        
        this.statistics = stats;
        this.updateStatsDisplay();
    }
    
    updateBestScore(newScore) {
        if (newScore > this.statistics.bestScore) {
            this.statistics.bestScore = newScore;
        }
        
        this.statistics.totalQuizzes++;
        this.statistics.totalCorrect += this.score;
        this.statistics.totalQuestions += this.questions.length;
        
        localStorage.setItem('anatomyQuizStats', JSON.stringify(this.statistics));
        this.updateStatsDisplay();
    }
    
    updateStatsDisplay() {
        document.getElementById('best-score').textContent = 
            `Mejor: ${this.statistics.bestScore}%`;
    }
    
    clearStorage() {
        if (confirm('¿Estás seguro de que quieres borrar todo el progreso guardado?')) {
            localStorage.removeItem('anatomyQuizProgress');
            localStorage.removeItem('anatomyQuizStats');
            localStorage.removeItem('tutorialShown');
            this.loadStatistics();
            alert('Progreso borrado correctamente.');
        }
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new AnatomyQuiz();
});