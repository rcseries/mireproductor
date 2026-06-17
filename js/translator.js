/**
 * Módulo para traducir subtítulos al español
 * Usa MyMemory API (gratuita) o fallback a traducción local
 */
class Translator {
    constructor() {
        this.sourceLanguage = 'auto';
        this.targetLanguage = 'es';
        this.useApi = true; // Intentar usar API primero
        this.apiUrl = 'https://api.mymemory.translated.net/get';
    }
    
    /**
     * Traduce un texto al español usando MyMemory API
     */
    async translateText(text) {
        if (!text || text.trim() === '') return text;
        
        try {
            if (this.useApi) {
                const result = await this.translateWithAPI(text);
                if (result) return result;
            }
            
            // Fallback a traducción local (muy básica)
            return this.translateLocal(text);
        } catch (error) {
            console.warn('Error en traducción, usando fallback local:', error);
            return this.translateLocal(text);
        }
    }
    
    /**
     * Traduce usando MyMemory API (gratuita, 1000 peticiones/día)
     */
    async translateWithAPI(text) {
        const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${this.sourceLanguage}|${this.targetLanguage}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
            
            throw new Error('No se recibió traducción');
        } catch (error) {
            console.warn('API de traducción falló:', error);
            return null;
        }
    }
    
    /**
     * Traducción local de emergencia (muy básica)
     */
    translateLocal(text) {
        // Diccionario básico para demostración
        const dictionary = {
            'hello': 'hola',
            'world': 'mundo',
            'good': 'bueno',
            'bad': 'malo',
            'love': 'amor',
            'hate': 'odio',
            'day': 'día',
            'night': 'noche',
            'yes': 'sí',
            'no': 'no',
            'thank': 'gracias',
            'you': 'usted',
            'please': 'por favor',
            'sorry': 'lo siento',
            'friend': 'amigo',
            'family': 'familia',
            'home': 'casa',
            'work': 'trabajo',
            'time': 'tiempo'
        };
        
        // Traducir palabra por palabra (muy limitado)
        const words = text.toLowerCase().split(' ');
        const translatedWords = words.map(word => {
            // Limpiar puntuación
            const cleanWord = word.replace(/[^a-zA-Záéíóúñü]/g, '');
            const translation = dictionary[cleanWord];
            
            if (translation) {
                // Mantener mayúsculas y puntuación original
                const punctuation = word.match(/[^a-zA-Záéíóúñü]/g) || [];
                return translation + punctuation.join('');
            }
            
            return word;
        });
        
        // Marcar como traducción automática
        return translatedWords.join(' ') + ' [TRADUCCIÓN AUTOMÁTICA]';
    }
    
    /**
     * Traduce un array completo de subtítulos
     */
    async translateSubtitles(subtitles, onProgress = null) {
        const total = subtitles.length;
        const translated = [];
        
        for (let i = 0; i < total; i++) {
            const subtitle = subtitles[i];
            
            try {
                // Traducir el texto
                const translatedText = await this.translateText(subtitle.text);
                
                translated.push({
                    ...subtitle,
                    text: translatedText,
                    originalText: subtitle.text // Guardar original por si acaso
                });
            } catch (error) {
                console.error(`Error traduciendo subtítulo ${i}:`, error);
                // Mantener texto original en caso de error
                translated.push({
                    ...subtitle,
                    text: subtitle.text + ' [ERROR TRADUCCIÓN]'
                });
            }
            
            // Reportar progreso
            if (onProgress) {
                onProgress(i + 1, total);
            }
            
            // Pequeña pausa para no sobrecargar la API
            if (this.useApi && i < total - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return translated;
    }
    
    /**
     * Alternar entre API y traducción local
     */
    setUseAPI(useApi) {
        this.useApi = useApi;
    }
}

// Exportar para usar en otros archivos
const translator = new Translator();
