/**
 * Aplicación principal: orquesta todos los módulos
 */
class App {
    constructor() {
        this.videoUrl = null;
        this.subtitles = null;
        this.translatedSubtitles = null;
        this.isProcessing = false;
        
        // Referencias a elementos DOM
        this.elements = {
            videoUrl: document.getElementById('videoUrl'),
            subtitleFile: document.getElementById('subtitleFile'),
            loadBtn: document.getElementById('loadBtn'),
            translateBtn: document.getElementById('translateBtn'),
            status: document.getElementById('statusMessage'),
            subtitleInfo: document.getElementById('subtitleInfo')
        };
        
        this.init();
    }
    
    /**
     * Inicializa la aplicación
     */
    init() {
        // Verificar que todos los elementos existan
        this.validateElements();
        
        // Inicializar reproductor
        try {
            videoPlayer.init('player');
            this.showStatus('Reproductor listo', 'info');
        } catch (error) {
            this.showStatus('Error al inicializar reproductor: ' + error.message, 'error');
        }
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar video de demostración
        this.loadDemoVideo();
    }
    
    /**
     * Valida que todos los elementos del DOM existan
     */
    validateElements() {
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.warn(`Elemento ${key} no encontrado en el DOM`);
            }
        }
    }
    
    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Botón cargar
        this.elements.loadBtn.addEventListener('click', () => this.handleLoad());
        
        // Botón traducir
        this.elements.translateBtn.addEventListener('click', () => this.handleTranslate());
        
        // Carga de archivo
        this.elements.subtitleFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.showStatus(`Archivo seleccionado: ${e.target.files[0].name}`, 'info');
            }
        });
        
        // Enter en el campo URL
        this.elements.videoUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLoad();
            }
        });
    }
    
    /**
     * Carga un video de demostración
     */
    loadDemoVideo() {
        const demoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        this.elements.videoUrl.value = demoUrl;
        
        // Cargar automáticamente después de un momento
        setTimeout(() => {
            this.handleLoad();
        }, 500);
    }
    
    /**
     * Maneja la carga de video y subtítulos
     */
    async handleLoad() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            this.showStatus('Procesando...', 'info');
            this.elements.loadBtn.disabled = true;
            
            // 1. Cargar video
            const url = this.elements.videoUrl.value.trim();
            if (!url) {
                throw new Error('Por favor ingresa una URL de video');
            }
            
            this.videoUrl = url;
            videoPlayer.loadVideo(url);
            
            // 2. Cargar subtítulos
            const file = this.elements.subtitleFile.files[0];
            if (!file) {
                throw new Error('Por favor selecciona un archivo de subtítulos');
            }
            
            // Leer y parsear subtítulos
            const content = await subtitleLoader.loadSubtitleFile(file);
            this.subtitles = subtitleLoader.parseSubtitleFile(content, file.name);
            
            if (!this.subtitles || this.subtitles.length === 0) {
                throw new Error('No se pudieron parsear los subtítulos');
            }
            
            // 3. Mostrar información
            this.updateSubtitleInfo(this.subtitles, 'Originales');
            
            // 4. Cargar subtítulos originales en el reproductor
            videoPlayer.addSubtitles(this.subtitles, 'en', 'Original (Inglés)');
            
            // 5. Habilitar botón de traducción
            this.elements.translateBtn.disabled = false;
            
            this.showStatus(`✅ Subtítulos cargados: ${this.subtitles.length} bloques`, 'success');
            
        } catch (error) {
            this.showStatus('❌ Error: ' + error.message, 'error');
            console.error('Error en handleLoad:', error);
        } finally {
            this.isProcessing = false;
            this.elements.loadBtn.disabled = false;
        }
    }
    
    /**
     * Maneja la traducción de subtítulos
     */
    async handleTranslate() {
        if (this.isProcessing || !this.subtitles) return;
        this.isProcessing = true;
        
        try {
            this.showStatus('🔄 Traduciendo subtítulos al español...', 'info');
            this.elements.translateBtn.disabled = true;
            this.elements.translateBtn.textContent = 'Traduciendo...';
            
            // Traducir subtítulos
            this.translatedSubtitles = await translator.translateSubtitles(
                this.subtitles,
                (current, total) => {
                    this.showStatus(`🔄 Traduciendo: ${current}/${total} bloques`, 'info');
                }
            );
            
            // Mostrar información de subtítulos traducidos
            this.updateSubtitleInfo(this.translatedSubtitles, 'Traducidos');
            
            // Cargar subtítulos traducidos en el reproductor
            videoPlayer.addSubtitles(this.translatedSubtitles, 'es', 'Español (Traducido)');
            
            this.showStatus(`✅ Traducción completada: ${this.translatedSubtitles.length} bloques traducidos al español`, 'success');
            
            // Mostrar ejemplo de traducción
            this.showTranslationExample();
            
        } catch (error) {
            this.showStatus('❌ Error en traducción: ' + error.message, 'error');
            console.error('Error en handleTranslate:', error);
        } finally {
            this.isProcessing = false;
            this.elements.translateBtn.disabled = false;
            this.elements.translateBtn.textContent = 'Traducir al Español';
        }
    }
    
    /**
     * Actualiza la información de subtítulos en la interfaz
     */
    updateSubtitleInfo(subtitles, type) {
        const infoEl = this.elements.subtitleInfo;
        if (!infoEl) return;
        
        // Calcular estadísticas
        const totalBlocks = subtitles.length;
        const totalWords = subtitles.reduce((sum, sub) => sum + sub.text.split(/\s+/).length, 0);
        const totalChars = subtitles.reduce((sum, sub) => sum + sub.text.length, 0);
        
        infoEl.innerHTML = `
            <div class="subtitle-stats">
                <div class="stat-item">
                    <strong>${type}:</strong>
                </div>
                <div class="stat-item">
                    <strong>Bloques:</strong> ${totalBlocks}
                </div>
                <div class="stat-item">
                    <strong>Palabras:</strong> ${totalWords}
                </div>
                <div class="stat-item">
                    <strong>Caracteres:</strong> ${totalChars}
                </div>
                <div class="stat-item">
                    <strong>Duración:</strong> ${this.formatDuration(subtitles)}
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: #718096;">
                ${subtitles.slice(0, 3).map(sub => 
                    `"${sub.text.substring(0, 60)}${sub.text.length > 60 ? '...' : ''}"`
                ).join(' | ')}
                ${subtitles.length > 3 ? '...' : ''}
            </div>
        `;
    }
    
    /**
     * Formatea la duración total de los subtítulos
     */
    formatDuration(subtitles) {
        if (!subtitles || subtitles.length === 0) return '0:00';
        
        const totalSeconds = subtitles[subtitles.length - 1].end;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    
    /**
     * Muestra un ejemplo de traducción
     */
    showTranslationExample() {
        if (!this.subtitles || !this.translatedSubtitles) return;
        
        const original = this.subtitles[0]?.text || '';
        const translated = this.translatedSubtitles[0]?.text || '';
        
        // Crear mensaje de ejemplo
        const exampleHTML = `
            <div style="margin-top: 15px; padding: 12px; background: #ebf8ff; border-radius: 8px; border-left: 4px solid #3182ce;">
                <p style="margin: 0; font-weight: 600; color: #2a4365;">📝 Ejemplo de traducción:</p>
                <p style="margin: 5px 0 0 0; color: #4a5568;">
                    <strong>Original:</strong> "${original.substring(0, 100)}${original.length > 100 ? '...' : ''}"
                </p>
                <p style="margin: 5px 0 0 0; color: #2a4365;">
                    <strong>Traducido:</strong> "${translated.substring(0, 100)}${translated.length > 100 ? '...' : ''}"
                </p>
            </div>
        `;
        
        const infoEl = this.elements.subtitleInfo;
        if (infoEl) {
            infoEl.innerHTML += exampleHTML;
        }
    }
    
    /**
     * Muestra mensajes de estado
     */
    showStatus(message, type = 'info') {
        const statusEl = this.elements.status;
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Para debugging en consola
});
