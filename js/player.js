/**
 * Módulo para controlar el reproductor de video (Plyr)
 * Versión corregida - Eliminado uso de trigger()
 */
class VideoPlayer {
    constructor() {
        this.player = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.subtitleTracks = [];
        this.isPlaying = false;
        this.hasUserInteracted = false;
        this.loadTimeout = null;
    }
    
    /**
     * Inicializa el reproductor en un elemento video
     */
    init(videoElementId = 'player') {
        this.videoElement = document.getElementById(videoElementId);
        
        if (!this.videoElement) {
            throw new Error('Elemento de video no encontrado');
        }
        
        // Configurar atributos para mejor compatibilidad
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('crossorigin', 'anonymous');
        
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
            keyboard: { focused: true, global: true },
            autoplay: false
        });
        
        this.isInitialized = true;
        
        // Configurar event listeners
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
        
        this.player.on('play', () => {
            this.isPlaying = true;
            this.hasUserInteracted = true;
            console.log('▶️ Reproducción iniciada');
        });
        
        this.player.on('pause', () => {
            this.isPlaying = false;
            console.log('⏸️ Reproducción pausada');
        });
        
        // Eventos nativos del video
        this.videoElement.addEventListener('loadedmetadata', () => {
            console.log('📹 Metadatos del video cargados');
        });
        
        this.videoElement.addEventListener('canplay', () => {
            console.log('✅ Video listo para reproducir');
        });
        
        this.videoElement.addEventListener('error', (e) => {
            console.error('❌ Error en video:', e);
            this.showStatus('Error al cargar el video. Verifica la URL o usa un proxy.', 'error');
        });
    }
    
    /**
     * Carga un video con manejo mejorado de CORS y autoplay
     */
    loadVideo(url) {
        if (!this.player) {
            throw new Error('Reproductor no inicializado');
        }
        
        if (!url || !this.isValidUrl(url)) {
            throw new Error('URL de video inválida');
        }
        
        console.log('📹 Cargando video:', url);
        
        // Limpiar timeout anterior
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
        }
        
        // Actualizar fuente del video
        const source = this.videoElement.querySelector('source');
        if (source) {
            source.src = url;
        }
        
        // Configurar CORS
        this.videoElement.crossOrigin = 'anonymous';
        
        // Recargar el video
        this.videoElement.load();
        
        // Intentar reproducir automáticamente con manejo de errores mejorado
        this.attemptAutoplay();
        
        this.showStatus('Video cargado correctamente', 'success');
        return true;
    }
    
    /**
     * Intenta reproducir automáticamente con manejo de errores
     */
    attemptAutoplay() {
        if (!this.videoElement) return;
        
        // Si el usuario ya interactuó, podemos reproducir sin problemas
        if (this.hasUserInteracted) {
            const playPromise = this.videoElement.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ Reproducción automática iniciada (usuario ya interactuó)');
                    })
                    .catch(error => {
                        console.warn('⚠️ Error en reproducción:', error);
                    });
            }
            return;
        }
        
        // Si no ha interactuado, intentar con muted (permite autoplay en Chrome)
        const wasMuted = this.videoElement.muted;
        this.videoElement.muted = true;
        
        const playPromise = this.videoElement.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ Reproducción automática iniciada (con muted)');
                    this.showStatus('▶️ Reproduciendo (sin audio). Haz clic en el altavoz para activar el sonido.', 'info');
                    
                    setTimeout(() => {
                        if (this.videoElement && !this.videoElement.muted) {
                            return;
                        }
                        this.showStatus('🔊 Haz clic en el botón de volumen para activar el sonido', 'info');
                    }, 1000);
                })
                .catch(error => {
                    console.warn('⏸️ Autoplay bloqueado. Esperando interacción del usuario.', error);
                    this.showStatus('⏸️ Haz clic en el botón de "Play" para reproducir el video', 'info');
                    this.videoElement.muted = wasMuted;
                });
        }
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
        
        if (!subtitles || subtitles.length === 0) {
            throw new Error('No hay subtítulos para agregar');
        }
        
        // Crear un archivo VTT en memoria
        const vttContent = this.subtitlesToVTT(subtitles);
        const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
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
        
        // ✅ Forzar actualización de subtítulos sin usar trigger()
        setTimeout(() => {
            if (this.player) {
                // Forzar recarga de subtítulos
                const tracks = this.videoElement.textTracks;
                for (let i = 0; i < tracks.length; i++) {
                    if (tracks[i].language === language) {
                        tracks[i].mode = 'showing';
                    }
                }
                
                // Actualizar la interfaz de Plyr manualmente
                if (this.player.elements && this.player.elements.captions) {
                    this.player.elements.captions.innerHTML = `<option value="${language}" selected>${label}</option>`;
                }
            }
        }, 300);
        
        this.showStatus(`✅ Subtítulos cargados: ${subtitles.length} bloques`, 'success');
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
        if (isNaN(seconds) || seconds < 0) seconds = 0;
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
            statusEl.style.display = 'block';
        }
    }
}

// Exportar para usar en otros archivos
const videoPlayer = new VideoPlayer();
