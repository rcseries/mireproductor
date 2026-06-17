/**
 * Módulo para controlar el reproductor de video (Plyr)
 */
class VideoPlayer {
    constructor() {
        this.player = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.subtitleTracks = [];
    }
    
    /**
     * Inicializa el reproductor en un elemento video
     */
    init(videoElementId = 'player') {
        this.videoElement = document.getElementById(videoElementId);
        
        if (!this.videoElement) {
            throw new Error('Elemento de video no encontrado');
        }
        
        // Inicializar Plyr
        this.player = new Plyr(this.videoElement, {
            controls: [
                'play-large',
                'play',
                'progress',
                'current-time',
                'mute',
                'volume',
                'captions',
                'settings',
                'pip',
                'airplay',
                'fullscreen'
            ],
            settings: ['captions', 'quality', 'speed'],
            captions: { active: true, update: true, language: 'es' },
            keyboard: { focused: true, global: true }
        });
        
        this.isInitialized = true;
        
        // Escuchar eventos del reproductor
        this.setupEventListeners();
        
        return this.player;
    }
    
    /**
     * Configura los event listeners del reproductor
     */
    setupEventListeners() {
        if (!this.player) return;
        
        this.player.on('ready', () => {
            console.log('Reproductor listo');
            this.showStatus('Reproductor listo', 'info');
        });
        
        this.player.on('error', (error) => {
            console.error('Error en reproductor:', error);
            this.showStatus('Error al cargar el video', 'error');
        });
    }
    
    /**
     * Carga un video desde una URL
     */
    loadVideo(url) {
        if (!this.player) {
            throw new Error('Reproductor no inicializado');
        }
        
        if (!url || !this.isValidUrl(url)) {
            throw new Error('URL de video inválida');
        }
        
        // Actualizar fuente del video
        const source = this.videoElement.querySelector('source');
        if (source) {
            source.src = url;
        }
        
        // Recargar el video
        this.videoElement.load();
        this.player.play();
        
        this.showStatus('Video cargado correctamente', 'success');
        return true;
    }
    
    /**
     * Valida si una URL es válida
     */
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    
    /**
     * Añade subtítulos al reproductor
     */
    addSubtitles(subtitles, language = 'es', label = 'Español') {
        if (!this.player) {
            throw new Error('Reproductor no inicializado');
        }
        
        // Crear un archivo VTT en memoria
        const vttContent = this.subtitlesToVTT(subtitles);
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Eliminar tracks anteriores
        this.removeAllSubtitles();
        
        // Crear el track
        const track = document.createElement('track');
        track.kind = 'captions';
        track.label = label;
        track.srclang = language;
        track.src = url;
        track.default = true;
        
        // Añadir al video
        this.videoElement.appendChild(track);
        this.subtitleTracks.push(track);
        
        // Forzar a Plyr a reconocer los nuevos subtítulos
        this.player.trigger('captionsenabled');
        this.player.trigger('languagechange');
        
        // Actualizar el selector de idiomas de Plyr
        setTimeout(() => {
            if (this.player.elements && this.player.elements.captions) {
                this.player.elements.captions.innerHTML = `<option value="es" selected>${label}</option>`;
            }
        }, 100);
        
        this.showStatus(`Subtítulos cargados: ${subtitles.length} bloques`, 'success');
        return true;
    }
    
    /**
     * Convierte subtítulos a formato VTT
     */
    subtitlesToVTT(subtitles) {
        let vtt = 'WEBVTT\n\n';
        
        subtitles.forEach(sub => {
            const start = this.formatTime(sub.start);
            const end = this.formatTime(sub.end);
            vtt += `${start} --> ${end}\n`;
            vtt += `${sub.text}\n\n`;
        });
        
        return vtt;
    }
    
    /**
     * Formatea tiempo para VTT (mm:ss.mmm)
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.round((seconds % 1) * 1000);
        
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    }
    
    /**
     * Elimina todos los subtítulos del reproductor
     */
    removeAllSubtitles() {
        this.subtitleTracks.forEach(track => {
            if (track.parentNode) {
                track.parentNode.removeChild(track);
            }
            if (track.src) {
                URL.revokeObjectURL(track.src);
            }
        });
        this.subtitleTracks = [];
        
        // Eliminar tracks nativos también
        const tracks = this.videoElement.querySelectorAll('track');
        tracks.forEach(track => {
            if (track.parentNode) {
                track.parentNode.removeChild(track);
            }
        });
    }
    
    /**
     * Mostrar estado en la interfaz
     */
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
        }
    }
}

// Exportar para usar en otros archivos
const videoPlayer = new VideoPlayer();
