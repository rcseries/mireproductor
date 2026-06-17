/**
 * Módulo para generar subtítulos usando reconocimiento de voz
 * (Experimental - funciona mejor en Chrome)
 */
class SubtitleGenerator {
    constructor() {
        this.isGenerating = false;
        this.subtitles = [];
        this.recognition = null;
        this.videoElement = null;
        this.currentText = '';
        this.lastTimestamp = 0;
        this.wordCount = 0;
        this.maxWordsPerSubtitle = 15;
        this.minDuration = 2; // segundos mínimos por subtítulo
    }
    
    /**
     * Inicializa el reconocimiento de voz
     */
    initRecognition() {
        // Verificar soporte
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            throw new Error('Tu navegador no soporta reconocimiento de voz');
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US'; // Inglés por defecto
        
        // Configurar eventos
        this.recognition.onresult = (event) => this.handleRecognitionResult(event);
        this.recognition.onerror = (event) => this.handleRecognitionError(event);
        this.recognition.onend = () => this.handleRecognitionEnd();
        
        return this.recognition;
    }
    
    /**
     * Genera subtítulos desde el audio del video
     */
    async generateSubtitles(videoElement, onProgress = null) {
        if (this.isGenerating) {
            throw new Error('Ya se está generando subtítulos');
        }
        
        this.isGenerating = true;
        this.videoElement = videoElement;
        this.subtitles = [];
        this.currentText = '';
        this.wordCount = 0;
        
        try {
            // Inicializar reconocimiento
            this.initRecognition();
            
            // Reproducir video y empezar reconocimiento
            videoElement.play();
            this.recognition.start();
            
            // Esperar a que termine el video
            await this.waitForVideoEnd(videoElement, onProgress);
            
            // Detener reconocimiento
            this.recognition.stop();
            
            // Procesar subtítulos finales
            this.finalizeSubtitles();
            
            return this.subtitles;
            
        } catch (error) {
            console.error('Error generando subtítulos:', error);
            throw error;
        } finally {
            this.isGenerating = false;
            this.videoElement = null;
        }
    }
    
    /**
     * Maneja los resultados del reconocimiento
     */
    handleRecognitionResult(event) {
        const results = event.results;
        let transcript = '';
        
        for (let i = event.resultIndex; i < results.length; i++) {
            const result = results[i];
            transcript += result[0].transcript;
            
            if (result.isFinal) {
                this.addSubtitle(transcript.trim());
            }
        }
    }
    
    /**
     * Añade un subtítulo al array
     */
    addSubtitle(text) {
        if (!text || text.trim() === '') return;
        
        const currentTime = this.videoElement ? this.videoElement.currentTime : 0;
        
        // Si hay texto acumulado, cerrarlo
        if (this.currentText && this.currentText.trim() !== '') {
            this.finalizeCurrentSubtitle(currentTime);
        }
        
        // Iniciar nuevo subtítulo
        this.currentText = text;
        this.lastTimestamp = currentTime;
        this.wordCount = text.split(/\s+/).length;
    }
    
    /**
     * Finaliza el subtítulo actual
     */
    finalizeCurrentSubtitle(endTime = null) {
        if (!this.currentText || this.currentText.trim() === '') return;
        
        const end = endTime || this.videoElement?.currentTime || this.lastTimestamp + 2;
        const duration = end - this.lastTimestamp;
        
        // Solo añadir si tiene duración suficiente
        if (duration >= this.minDuration) {
            this.subtitles.push({
                index: this.subtitles.length + 1,
                start: Math.round(this.lastTimestamp * 100) / 100,
                end: Math.round(end * 100) / 100,
                text: this.currentText.trim(),
                originalText: this.currentText.trim()
            });
        }
        
        this.currentText = '';
        this.wordCount = 0;
    }
    
    /**
     * Finaliza todos los subtítulos pendientes
     */
    finalizeSubtitles() {
        if (this.currentText && this.currentText.trim() !== '') {
            const endTime = this.videoElement?.duration || this.lastTimestamp + 2;
            this.finalizeCurrentSubtitle(endTime);
        }
        
        // Asegurar que todos los subtítulos tengan tiempos válidos
        this.normalizeTimestamps();
    }
    
    /**
     * Normaliza los timestamps de los subtítulos
     */
    normalizeTimestamps() {
        for (let i = 0; i < this.subtitles.length; i++) {
            const sub = this.subtitles[i];
            
            // Asegurar que el inicio no sea mayor que el fin
            if (sub.start >= sub.end) {
                sub.end = sub.start + 2;
            }
            
            // Asegurar que no haya solapamiento
            if (i > 0) {
                const prev = this.subtitles[i - 1];
                if (sub.start < prev.end) {
                    sub.start = prev.end + 0.1;
                }
            }
        }
    }
    
    /**
     * Espera a que el video termine
     */
    waitForVideoEnd(videoElement, onProgress) {
        return new Promise((resolve) => {
            const checkProgress = () => {
                if (!videoElement.paused && !videoElement.ended) {
                    const progress = (videoElement.currentTime / videoElement.duration) * 100;
                    if (onProgress) {
                        onProgress(Math.min(progress, 100));
                    }
                    setTimeout(checkProgress, 100);
                } else {
                    if (onProgress) {
                        onProgress(100);
                    }
                    resolve();
                }
            };
            
            // Verificar si el video ya terminó
            if (videoElement.ended) {
                if (onProgress) onProgress(100);
                resolve();
            } else {
                checkProgress();
            }
        });
    }
    
    /**
     * Maneja errores de reconocimiento
     */
    handleRecognitionError(event) {
        console.warn('Error en reconocimiento de voz:', event.error);
        
        if (event.error === 'not-allowed') {
            throw new Error('Permiso de micrófono denegado');
        }
    }
    
    /**
     * Maneja el fin del reconocimiento
     */
    handleRecognitionEnd() {
        console.log('Reconocimiento finalizado');
        this.finalizeSubtitles();
    }
    
    /**
     * Convierte los subtítulos generados a formato SRT
     */
    toSRT() {
        const loader = new SubtitleLoader();
        return loader.toSRT(this.subtitles);
    }
    
    /**
     * Verifica si el navegador soporta reconocimiento de voz
     */
    static isSupported() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    }
}

// Exportar
const subtitleGenerator = new SubtitleGenerator();
