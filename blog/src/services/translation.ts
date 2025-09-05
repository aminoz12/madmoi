// LibreTranslate Service - Traduction automatique gratuite
export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

// Configuration LibreTranslate
const LIBRE_TRANSLATE_URL = 'https://libretranslate.com/translate';
const FALLBACK_URL = 'https://translate.argosopentech.com/translate';

// Cache pour éviter les traductions répétées
const translationCache = new Map<string, string>();

export class LibreTranslateService {
  private static instance: LibreTranslateService;
  private currentUrl: string = LIBRE_TRANSLATE_URL;

  static getInstance(): LibreTranslateService {
    if (!LibreTranslateService.instance) {
      LibreTranslateService.instance = new LibreTranslateService();
    }
    return LibreTranslateService.instance;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const cacheKey = `${request.sourceLang}-${request.targetLang}-${request.text}`;
    
    // Vérifier le cache d'abord
    if (translationCache.has(cacheKey)) {
      return {
        translatedText: translationCache.get(cacheKey)!,
        detectedLanguage: request.sourceLang
      };
    }

    try {
      const response = await this.makeTranslationRequest(request);
      
      // Mettre en cache le résultat
      translationCache.set(cacheKey, response.translatedText);
      
      return response;
    } catch (error) {
      console.error('Translation error:', error);
      
      // Fallback au texte original en cas d'erreur
      return {
        translatedText: request.text,
        detectedLanguage: request.sourceLang
      };
    }
  }

  private async makeTranslationRequest(request: TranslationRequest): Promise<TranslationResponse> {
    const payload = {
      q: request.text,
      source: request.sourceLang,
      target: request.targetLang,
      format: 'text'
    };

    try {
      const response = await fetch(this.currentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        translatedText: data.translatedText || request.text,
        detectedLanguage: data.detected?.confidence ? request.sourceLang : undefined,
        confidence: data.detected?.confidence
      };
    } catch (error) {
      // Essayer l'URL de fallback
      if (this.currentUrl === LIBRE_TRANSLATE_URL) {
        this.currentUrl = FALLBACK_URL;
        return this.makeTranslationRequest(request);
      }
      throw error;
    }
  }

  // Traduire plusieurs textes en une fois
  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResponse[]> {
    const promises = requests.map(req => this.translate(req));
    return Promise.all(promises);
  }

  // Vider le cache
  clearCache(): void {
    translationCache.clear();
  }

  // Obtenir les statistiques du cache
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: translationCache.size,
      keys: Array.from(translationCache.keys())
    };
  }
}

// Instance singleton
export const libreTranslate = LibreTranslateService.getInstance();
