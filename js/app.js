/**
 * Aplicación principal - Versión Corregida
 * Soluciona problemas de: CORS, autoplay, y carga de subtítulos
 */
class App {
    constructor() {
        this.videoUrl = null;
        this.subtitles = null;
        this.translatedSubtitles = null;
        this.isProcessing = false;
        this.subtitleSource = 'auto';
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',  // Proxy principal (más estable)
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        this.currentProxyIndex = 0;
        
        // Referencias a elementos DOM
        this.elements = {
            videoUrl: document.getElementById('videoUrl'),
            subtitleFile: document.getElementById('subtitleFile'),
            subtitleUrl: document.getElementById('subtitleUrl'),
            loadBtn: document.getElementById('loadBtn'),
            subtitlesBtn: document.getElementById('subtitlesBtn'),
            translateBtn: document.getElementById('translateBtn'),
            status: document.getElementById('statusMessage'),
            subtitleInfo: document.getElementById('subtitleInfo'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.querySelector('.progress-fill')
        };
        
        this.init();
    }
    
    /**
     * Inicializa la aplicación
     */
    init() {
        this.validateElements();
        this.setupEventListeners();
        this.setupRadioButtons();
        
        try {
            videoPlayer.init('player');
            this.showStatus('Reproductor listo. Carga un video y luego los subtítulos.', 'info');
        } catch (error) {
            this.showStatus('Error al inicializar reproductor: ' + error.message, 'error');
        }
        
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
     * Configura los radio buttons para fuente de subtítulos
     */
    setupRadioButtons() {
        const radios = document.querySelectorAll('input[name="subtitleSource"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.subtitleSource = e.target.value;
                this.updateSubtitleOptions(e.target.value);
            });
        });
        
        const defaultRadio = document.querySelector('input[name="subtitleSource"]:checked');
        if (defaultRadio) {
            this.subtitleSource = defaultRadio.value;
            this.updateSubtitleOptions(defaultRadio.value);
        }
    }
    
    /**
     * Muestra/oculta opciones según la fuente seleccionada
     */
    updateSubtitleOptions(source) {
        document.getElementById('fileOptions').style.display = 'none';
        document.getElementById('urlOptions').style.display = 'none';
        document.getElementById('generateOptions').style.display = 'none';
        
        switch(source) {
            case 'file':
                document.getElementById('fileOptions').style.display = 'block';
                break;
            case 'url':
                document.getElementById('urlOptions').style.display = 'block';
                break;
            case 'generate':
                document.getElementById('generateOptions').style.display = 'block';
                break;
        }
        
        const subtitlesBtn = this.elements.subtitlesBtn;
        if (source === 'auto' || source === 'generate') {
            subtitlesBtn.disabled = false;
            subtitlesBtn.textContent = source === 'auto' ? 'Buscar Subtítulos' : 'Generar Subtítulos';
        } else {
            const hasContent = source === 'file' ? 
                this.elements.subtitleFile.files.length > 0 :
                this.elements.subtitleUrl.value.trim() !== '';
            subtitlesBtn.disabled = !hasContent;
            subtitlesBtn.textContent = 'Cargar Subtítulos';
        }
        
        this.elements.translateBtn.disabled = !this.subtitles;
    }
    
    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Botón cargar video
        this.elements.loadBtn.addEventListener('click', () => this.handleLoad());
        
        // Botón obtener subtítulos
        this.elements.subtitlesBtn.addEventListener('click', () => this.handleSubtitles());
        
        // Botón traducir
        this.elements.translateBtn.addEventListener('click', () => this.handleTranslate());
        
        // Enter en campo URL de video
        this.elements.videoUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLoad();
            }
        });
        
        // Enter en campo URL de subtítulos
        if (this.elements.subtitleUrl) {
            this.elements.subtitleUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSubtitles();
                }
            });
        }
        
        // Cambio en archivo de subtítulos
        if (this.elements.subtitleFile) {
            this.elements.subtitleFile.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.showStatus(`Archivo seleccionado: ${e.target.files[0].name}`, 'info');
                    if (this.subtitleSource === 'file') {
                        this.elements.subtitlesBtn.disabled = false;
                    }
                }
            });
        }
    }
    
    /**
     * Carga un video con soporte para CORS
     */
    loadDemoVideo() {
        // Usar un video que permita CORS para demostración
        const demoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        if (this.elements.videoUrl) {
            this.elements.videoUrl.value = demoUrl;
        }
        
        // Cargar automáticamente después de un momento
        setTimeout(() => {
            this.handleLoad();
        }, 500);
    }
    
    /**
     * Maneja la carga del video (CORREGIDO para CORS y Autoplay)
     */
    async handleLoad() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            this.showStatus('Cargando video...', 'info');
            this.elements.loadBtn.disabled = true;
            
            let url = this.elements.videoUrl.value.trim();
            if (!url) {
                throw new Error('Por favor ingresa una URL de video');
            }
            
            // ✅ Manejar CORS: Si es de kisskh u otros sitios bloqueados, usar proxy
            if (this.isCorsBlockedUrl(url)) {
                const proxyUrl = await this.getWorkingProxy(url);
                if (proxyUrl) {
                    this.showStatus('🔄 Usando proxy para evitar bloqueos CORS...', 'info');
                    url = proxyUrl;
                } else {
                    this.showStatus('⚠️ No se pudo encontrar un proxy funcional. Intentando cargar directamente...', 'warning');
                }
            }
            
            this.videoUrl = url;
            
            // ✅ Cargar el video en el reproductor (ya maneja autoplay)
            videoPlayer.loadVideo(url);
            
            this.showStatus('✅ Video cargado correctamente. Ahora obtén los subtítulos.', 'success');
            this.elements.subtitlesBtn.disabled = false;
            
        } catch (error) {
            this.showStatus('❌ Error al cargar video: ' + error.message, 'error');
            console.error('Error en handleLoad:', error);
        } finally {
            this.isProcessing = false;
            this.elements.loadBtn.disabled = false;
        }
    }
    
    /**
     * Detecta si una URL necesita proxy CORS
     */
    isCorsBlockedUrl(url) {
        const blockedDomains = [
            'kisskh', 'kissasian', 'dramacool', 'myasiantv',
            'stream', '.do', '.to', 'openload', 'rapidvideo'
        ];
        return blockedDomains.some(domain => url.toLowerCase().includes(domain));
    }
    
    /**
     * Intenta obtener un proxy funcional para la URL
     */
    async getWorkingProxy(url) {
        // Probar cada proxy hasta encontrar uno que funcione
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxy = this.corsProxies[i];
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            
            try {
                this.showStatus(`🔄 Probando proxy ${i + 1}/${this.corsProxies.length}...`, 'info');
                // Hacer una petición de prueba al proxy
                const response = await fetch(proxyUrl, {
                    method: 'HEAD',
                    mode: 'cors',
                    signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
                });
                
                if (response.ok || response.status === 403) {
                    // Si responde (incluso con 403), es porque el proxy está activo
                    this.currentProxyIndex = i;
                    return proxyUrl;
                }
            } catch (error) {
                console.warn(`Proxy ${i + 1} falló:`, error.message);
                continue;
            }
        }
        
        // Si ningún proxy funciona, devolver null
        return null;
    }
    
    /**
     * Maneja la obtención de subtítulos (CORREGIDO)
     */
    async handleSubtitles() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            this.showStatus('Obteniendo subtítulos...', 'info');
            this.elements.subtitlesBtn.disabled = true;
            this.showProgress(0);
            
            let subtitles = null;
            
            switch (this.subtitleSource) {
                case 'auto':
                    subtitles = await this.getSubtitlesAuto();
                    break;
                case 'file':
                    subtitles = await this.getSubtitlesFile();
                    break;
                case 'url':
                    subtitles = await this.getSubtitlesUrl();
                    break;
                case 'generate':
                    subtitles = await this.getSubtitlesGenerate();
                    break;
                default:
                    throw new Error('Fuente de subtítulos no válida');
            }
            
            if (subtitles && subtitles.length > 0) {
                this.subtitles = subtitles;
                this.updateSubtitleInfo(subtitles, 'Originales');
                videoPlayer.addSubtitles(subtitles, 'en', 'Original');
                this.elements.translateBtn.disabled = false;
                this.showStatus(`✅ ${subtitles.length} subtítulos obtenidos correctamente`, 'success');
            } else {
                throw new Error('No se encontraron subtítulos');
            }
            
        } catch (error) {
            this.showStatus('❌ Error obteniendo subtítulos: ' + error.message, 'error');
            console.error('Error en handleSubtitles:', error);
        } finally {
            this.isProcessing = false;
            this.elements.subtitlesBtn.disabled = false;
            this.hideProgress();
        }
    }
    
    /**
     * Obtiene subtítulos automáticamente
     */
    async getSubtitlesAuto() {
        try {
            const subtitles = await subtitleFinder.getSubtitles(this.videoUrl);
            if (subtitles && subtitles.length > 0) {
                return subtitles;
            }
            this.showStatus('No se encontraron subtítulos en línea. Generando con IA...', 'info');
            return await this.getSubtitlesGenerate();
        } catch (error) {
            console.error('Error en búsqueda automática:', error);
            return await this.getSubtitlesGenerate();
        }
    }
    
    /**
     * Obtiene subtítulos desde archivo local
     */
    async getSubtitlesFile() {
        const file = this.elements.subtitleFile.files[0];
        if (!file) {
            throw new Error('Por favor selecciona un archivo de subtítulos');
        }
        
        const validExtensions = ['.srt', '.vtt'];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValid) {
            throw new Error('Formato no soportado. Usa .srt o .vtt');
        }
        
        const content = await subtitleLoader.loadSubtitleFile(file);
        return subtitleLoader.parseSubtitleFile(content, file.name);
    }
    
    /**
     * Obtiene subtítulos desde URL
     */
    async getSubtitlesUrl() {
        const url = this.elements.subtitleUrl.value.trim();
        if (!url) {
            throw new Error('Por favor ingresa una URL de subtítulos');
        }
        
        try {
            const content = await subtitleFinder.downloadSubtitles(url);
            return subtitleLoader.parseSubtitleFile(content, url);
        } catch (error) {
            throw new Error('No se pudo descargar el archivo de subtítulos: ' + error.message);
        }
    }
    
    /**
     * Genera subtítulos con IA (speech-to-text)
     */
    async getSubtitlesGenerate() {
        // Verificar soporte del navegador
        if (!SubtitleGenerator.isSupported()) {
            throw new Error('Tu navegador no soporta generación de subtítulos por voz. Usa Chrome.');
        }
        
        const videoElement = document.getElementById('player');
        if (!videoElement) {
            throw new Error('Elemento de video no encontrado');
        }
        
        // ✅ Verificar que el video esté cargado correctamente
        if (!videoElement.duration || videoElement.duration === 0 || isNaN(videoElement.duration)) {
            throw new Error('El video no está cargado o es inválido. Asegúrate de que el video se haya cargado correctamente.');
        }
        
        // Verificar que el video tenga audio
        if (videoElement.muted) {
            this.showStatus('ℹ️ El video está silenciado. Activando audio para generar subtítulos...', 'info');
            videoElement.muted = false;
        }
        
        // Obtener opciones
        const translateCheck = document.getElementById('translateGenerated');
        const translate = translateCheck ? translateCheck.checked : true;
        
        this.showStatus('🎙️ Generando subtítulos desde el audio... (esto puede tomar varios minutos)', 'info');
        this.showProgress(0);
        
        try {
            // Generar subtítulos
            const subtitles = await subtitleGenerator.generateSubtitles(
                videoElement,
                (progress) => {
                    this.showProgress(progress);
                    if (progress < 100) {
                        this.showStatus(`🎙️ Generando: ${Math.round(progress)}% completado`, 'info');
                    }
                }
            );
            
            if (!subtitles || subtitles.length === 0) {
                throw new Error('No se generaron subtítulos. Asegúrate de que el video tenga audio en inglés.');
            }
            
            // Traducir si está habilitado
            if (translate) {
                this.showStatus('🔄 Traduciendo subtítulos generados al español...', 'info');
                this.showProgress(0);
                
                const translated = await translator.translateSubtitles(
                    subtitles,
                    (current, total) => {
                        const progress = (current / total) * 100;
                        this.showProgress(progress);
                        this.showStatus(`🔄 Traduciendo: ${current}/${total} subtítulos`, 'info');
                    }
                );
                
                return translated;
            }
            
            return subtitles;
            
        } catch (error) {
            console.error('Error generando subtítulos:', error);
            throw new Error('Error en la generación: ' + error.message);
        }
    }
    
    /**
     * Maneja la traducción de subtítulos
     */
    async handleTranslate() {
        if (this.isProcessing) return;
        if (!this.subtitles) {
            this.showStatus('⚠️ Primero carga algunos subtítulos', 'error');
            return;
        }
        
        // Verificar si ya están traducidos
        if (this.translatedSubtitles) {
            this.showStatus('ℹ️ Los subtítulos ya están traducidos', 'info');
            return;
        }
        
        this.isProcessing = true;
        
        try {
            this.showStatus('🔄 Traduciendo subtítulos al español...', 'info');
            this.elements.translateBtn.disabled = true;
            this.elements.translateBtn.textContent = 'Traduciendo...';
            this.showProgress(0);
            
            this.translatedSubtitles = await translator.translateSubtitles(
                this.subtitles,
                (current, total) => {
                    const progress = (current / total) * 100;
                    this.showProgress(progress);
                    this.showStatus(`🔄 Traduciendo: ${current}/${total} subtítulos`, 'info');
                }
            );
            
            // Actualizar interfaz
            this.updateSubtitleInfo(this.translatedSubtitles, 'Traducidos');
            
            // Cargar subtítulos traducidos en el reproductor
            videoPlayer.addSubtitles(this.translatedSubtitles, 'es', 'Español (Traducido)');
            
            this.showStatus(`✅ Traducción completada: ${this.translatedSubtitles.length} subtítulos traducidos al español`, 'success');
            
            // Mostrar ejemplo de traducción
            this.showTranslationExample();
            
            // Cambiar texto del botón
            this.elements.translateBtn.textContent = '¡Traducido!';
            setTimeout(() => {
                this.elements.translateBtn.textContent = 'Traducir al Español';
            }, 3000);
            
        } catch (error) {
            this.showStatus('❌ Error en traducción: ' + error.message, 'error');
            console.error('Error en handleTranslate:', error);
        } finally {
            this.isProcessing = false;
            this.elements.translateBtn.disabled = false;
            this.hideProgress();
        }
    }
    
    /**
     * Actualiza la información de subtítulos en la interfaz
     */
    updateSubtitleInfo(subtitles, type) {
        const infoEl = this.elements.subtitleInfo;
        if (!infoEl) return;
        
        if (!subtitles || subtitles.length === 0) {
            infoEl.innerHTML = `<p>ℹ️ No hay subtítulos disponibles</p>`;
            return;
        }
        
        // Calcular estadísticas
        const totalBlocks = subtitles.length;
        const totalWords = subtitles.reduce((sum, sub) => sum + (sub.text ? sub.text.split(/\s+/).length : 0), 0);
        const totalChars = subtitles.reduce((sum, sub) => sum + (sub.text ? sub.text.length : 0), 0);
        const totalDuration = subtitles[subtitles.length - 1]?.end || 0;
        
        // Formatear duración
        const minutes = Math.floor(totalDuration / 60);
        const seconds = Math.floor(totalDuration % 60);
        const durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        // Mostrar primeros 3 subtítulos como ejemplo
        const examples = subtitles.slice(0, 3).map(sub => {
            const text = sub.text || '';
            return `"${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`;
        }).join(' | ');
        
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
                    <strong>Duración:</strong> ${durationStr}
                </div>
                <div class="stat-item">
                    <strong>Idioma:</strong> ${type === 'Originales' ? 'Original' : 'Español'}
                </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: #718096;">
                ${examples}
                ${subtitles.length > 3 ? ' <span style="color: #a0aec0;">...y más</span>' : ''}
            </div>
        `;
    }
    
    /**
     * Muestra un ejemplo de traducción
     */
    showTranslationExample() {
        if (!this.subtitles || !this.translatedSubtitles) return;
        if (this.subtitles.length === 0 || this.translatedSubtitles.length === 0) return;
        
        const original = this.subtitles[0]?.text || '';
        const translated = this.translatedSubtitles[0]?.text || '';
        
        if (!original || !translated) return;
        
        const infoEl = this.elements.subtitleInfo;
        if (!infoEl) return;
        
        // Crear mensaje de ejemplo
        const exampleHTML = `
            <div style="margin-top: 15px; padding: 12px; background: #ebf8ff; border-radius: 8px; border-left: 4px solid #3182ce;">
                <p style="margin: 0; font-weight: 600; color: #2a4365;">📝 Ejemplo de traducción:</p>
                <p style="margin: 5px 0 0 0; color: #4a5568; font-size: 0.9rem;">
                    <strong>Original:</strong> "${original.substring(0, 100)}${original.length > 100 ? '...' : ''}"
                </p>
                <p style="margin: 5px 0 0 0; color: #2a4365; font-size: 0.9rem;">
                    <strong>Traducido:</strong> "${translated.substring(0, 100)}${translated.length > 100 ? '...' : ''}"
                </p>
            </div>
        `;
        
        infoEl.innerHTML += exampleHTML;
    }
    
    /**
     * Muestra barra de progreso
     */
    showProgress(percentage) {
        const bar = this.elements.progressBar;
        const fill = this.elements.progressFill;
        
        if (bar) bar.style.display = 'block';
        if (fill) {
            const pct = Math.min(Math.max(percentage, 0), 100);
            fill.style.width = `${pct}%`;
            
            // Cambiar color según progreso
            if (pct < 30) {
                fill.style.background = '#fc8181';
            } else if (pct < 70) {
                fill.style.background = '#f6ad55';
            } else {
                fill.style.background = '#68d391';
            }
        }
    }
    
    /**
     * Oculta barra de progreso
     */
    hideProgress() {
        const bar = this.elements.progressBar;
        if (bar) bar.style.display = 'none';
    }
    
    /**
     * Muestra mensajes de estado
     */
    showStatus(message, type = 'info') {
        const statusEl = this.elements.status;
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            statusEl.style.display = 'block';
            
            // Auto-ocultar mensajes de éxito después de 5 segundos
            if (type === 'success') {
                clearTimeout(this.statusTimeout);
                this.statusTimeout = setTimeout(() => {
                    if (statusEl) {
                        statusEl.style.display = 'none';
                    }
                }, 5000);
            }
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Para debugging en consola
    console.log('🎬 Aplicación de reproductor iniciada');
    console.log('ℹ️ Usa window.app para acceder a la instancia');
});
