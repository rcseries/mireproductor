/**
 * Módulo para cargar y parsear archivos de subtítulos (SRT y VTT)
 */
class SubtitleLoader {
    constructor() {
        this.supportedFormats = ['.srt', '.vtt'];
    }
    
    /**
     * Lee un archivo de subtítulos y devuelve su contenido como texto
     */
    async loadSubtitleFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    resolve(content);
                } catch (error) {
                    reject(new Error('Error al leer el archivo: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    /**
     * Parsea un archivo SRT y lo convierte en un array de objetos
     */
    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length < 3) continue;
            
            // El primer elemento es el número de secuencia
            const index = parseInt(lines[0]);
            
            // El segundo elemento es el tiempo (formato: 00:00:00,000 --> 00:00:00,000)
            const timeLine = lines[1];
            const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
            
            if (!timeMatch) continue;
            
            // El resto son líneas de texto
            const text = lines.slice(2).join('\n');
            
            subtitles.push({
                index: index,
                start: this.timeToSeconds(timeMatch[1]),
                end: this.timeToSeconds(timeMatch[2]),
                startRaw: timeMatch[1],
                endRaw: timeMatch[2],
                text: text
            });
        }
        
        return subtitles;
    }
    
    /**
     * Parsea un archivo VTT (similar a SRT pero con encabezado)
     */
    parseVTT(content) {
        // Eliminar el encabezado WEBVTT
        const lines = content.split('\n');
        let startIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().toUpperCase().startsWith('WEBVTT')) {
                startIndex = i + 1;
                break;
            }
        }
        
        // El resto es similar a SRT
        const srtContent = lines.slice(startIndex).join('\n');
        return this.parseSRT(srtContent);
    }
    
    /**
     * Convierte tiempo HH:MM:SS,mmm a segundos
     */
    timeToSeconds(timeStr) {
        // Reemplazar coma por punto para milisegundos
        timeStr = timeStr.replace(',', '.');
        const parts = timeStr.split(':');
        
        if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
        }
        
        return 0;
    }
    
    /**
     * Convierte segundos a formato HH:MM:SS,mmm
     */
    secondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.round((seconds % 1) * 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    }
    
    /**
     * Detecta automáticamente el formato y parsea
     */
    parseSubtitleFile(content, fileName) {
        const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        
        if (ext === '.srt') {
            return this.parseSRT(content);
        } else if (ext === '.vtt') {
            return this.parseVTT(content);
        } else {
            throw new Error('Formato de subtítulo no soportado. Use .srt o .vtt');
        }
    }
    
    /**
     * Convierte un array de subtítulos a formato SRT
     */
    toSRT(subtitles) {
        return subtitles.map(sub => {
            const start = this.secondsToTime(sub.start);
            const end = this.secondsToTime(sub.end);
            return `${sub.index}\n${start} --> ${end}\n${sub.text}`;
        }).join('\n\n');
    }
}

// Exportar para usar en otros archivos
const subtitleLoader = new SubtitleLoader();
