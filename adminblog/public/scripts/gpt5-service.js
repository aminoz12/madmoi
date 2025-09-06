 
class GPT5Service {
  constructor() {
    // Try to get API key from environment or use fallback
    this.apiKey = this.getApiKey();
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
    this.isApiKeyValid = false; // Will be updated when we test the API
  }

  // Get API key from various sources
  getApiKey() {
    // Try to get from localStorage first (for user input)
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey && storedKey.trim()) {
      console.log('GPT Service: Using API key from localStorage');
      return storedKey.trim();
    }

    // Try meta tag (for environment variable injection)
    const metaKey = document.querySelector('meta[name="openai-api-key"]')?.content;
    if (metaKey && metaKey.trim() && metaKey !== 'your-openai-api-key-here') {
      console.log('GPT Service: Using API key from meta tag');
      return metaKey.trim();
    }

    // Try to get from environment variable (if available)
    if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
      console.log('GPT Service: Using API key from environment');
      return process.env.OPENAI_API_KEY;
    }

    // No valid API key found
    console.warn('GPT Service: No valid API key found. Please configure one in Settings.');
    return null;
  }

  // Set API key from user input
  setApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      this.apiKey = apiKey.trim();
      localStorage.setItem('openai_api_key', this.apiKey);
      this.isApiKeyValid = false; // Reset validation status
      console.log('GPT Service: API key updated');
      return true;
    }
    return false;
  }

  // Test API key validity
  async testApiKey() {
    try {
      console.log('GPT Service: Testing API key validity...');
      
      if (!this.apiKey || this.apiKey.trim() === '') {
        console.error('GPT Service: No API key available');
        this.isApiKeyValid = false;
        return false;
      }

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: 'Test'
            }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        this.isApiKeyValid = true;
        console.log('GPT Service: API key is valid');
        return true;
      } else {
        this.isApiKeyValid = false;
        const errorText = await response.text();
        console.error('GPT Service: API key is invalid or expired:', errorText);
        return false;
      }
    } catch (error) {
      this.isApiKeyValid = false;
      console.error('GPT Service: Error testing API key:', error);
      return false;
    }
  }

  // Generate article content using GPT-5
  async generateArticle(prompt, options = {}) {
    try {
      // Check if API key is available
      if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'your-openai-api-key-here') {
        return {
          success: false,
          error: 'OpenAI API key is not configured. Please set your API key in the Settings page or localStorage.',
          data: null
        };
      }
      const {
        title = '',
        category = '',
        tone = 'professional',
        length = 'medium',
        language = 'French'
      } = options;

      // Define character limits based on length selection
      const lengthLimits = {
        'short': '600 mots',
        'medium': '1500 mots',  
        'long': '3000 mots',
        'extra-long': '4000+ mots'
      };

      const systemPrompt = `Tu es un expert rédacteur de blog professionnel. 
      Génère un article de blog complet et engageant en ${language}.
      
      Ton: ${tone}
      Longueur: ${lengthLimits[length] || lengthLimits.medium}
      Catégorie: ${category}
      
      IMPORTANT: Respecte strictement la longueur demandée en nombre de mots.
      
      L'article doit inclure:
      - Un titre accrocheur
      - Une introduction captivante
      - Un contenu structuré avec des sous-titres
      - Une conclusion engageante
      - Des mots-clés pertinents
      - Le nombre de mots doit correspondre à la longueur demandée
      
      Format de réponse: JSON avec les champs suivants:
      {
        "title": "Titre de l'article",
        "content": "Contenu complet de l'article",
        "excerpt": "Résumé court (max 200 caractères)",
        "keywords": ["mot-clé1", "mot-clé2", "mot-clé3"],
        "wordCount": 0,
        "estimatedReadTime": 5,
        "category": "${category}"
      }`;

      const userPrompt = title ? 
        `Génère un article sur: "${title}"` : 
        prompt;

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using GPT-4o as GPT-5 is not yet available
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('GPT Service: Raw API response for article:', data);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('GPT Service: Article content received:', content);
        
        // Try to parse JSON response
        try {
          const parsedContent = JSON.parse(content);
          console.log('GPT Service: Parsed article content:', parsedContent);
          return {
            success: true,
            data: parsedContent,
            rawResponse: content
          };
        } catch (parseError) {
          console.log('GPT Service: JSON parse failed, using raw content as fallback');
          // If JSON parsing fails, return the raw content
          return {
            success: true,
            data: {
              title: title || 'Article généré par GPT-5',
              content: content,
              excerpt: content.substring(0, 200) + '...',
              keywords: ['gpt-5', 'article', 'généré'],
              wordCount: content.split(' ').length,
              estimatedReadTime: Math.ceil(content.split(' ').length / 200)
            },
            rawResponse: content,
            fallback: true
          };
        }
      } else {
        console.error('GPT Service: Invalid response format:', data);
        throw new Error('Invalid response format from GPT-5');
      }

    } catch (error) {
      console.error('Error generating article with GPT-5:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to OpenAI API. Please check your internet connection and API key.';
      } else if (error.message.includes('HTTP error! status: 401')) {
        errorMessage = 'Authentication failed: Invalid or expired API key. Please check your OpenAI API key.';
      } else if (error.message.includes('HTTP error! status: 429')) {
        errorMessage = 'Rate limit exceeded: Too many requests to OpenAI API. Please wait a moment and try again.';
      } else if (error.message.includes('HTTP error! status: 500')) {
        errorMessage = 'OpenAI API server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  }

  // Generate multiple article ideas
  async generateArticleIdeas(category = '', count = 5) {
    // Dynamic category-specific fallback ideas generator
    const generateDynamicIdeas = (cat) => {
      // Generate ideas based on the actual category name
      const categoryLower = cat.toLowerCase();
      
      // Create dynamic ideas based on the category
      const dynamicIdeas = [];
      
      if (categoryLower.includes('love') || categoryLower.includes('amour') || categoryLower.includes('relation')) {
        dynamicIdeas.push(
          {
            title: "Comment Construire une Relation Durable et Épanouie",
            description: "Les clés pour développer une relation amoureuse saine et épanouissante",
            keywords: ["amour", "relation", "durabilité", "épanouissement"],
            estimatedReadTime: 8
          },
          {
            title: "Communication dans le Couple : Les Secrets d'une Entente Parfaite",
            description: "Techniques pour améliorer la communication et résoudre les conflits",
            keywords: ["communication", "couple", "entente", "conflits"],
            estimatedReadTime: 7
          },
          {
            title: "Garder la Flamme Vivante : Idées Romantiques pour Tous les Jours",
            description: "Petits gestes et activités pour maintenir la passion au quotidien",
            keywords: ["romance", "passion", "quotidien", "flamme"],
            estimatedReadTime: 6
          },
          {
            title: "Reconnaître l'Amour Vrai : Signes d'une Relation Authentique",
            description: "Comment distinguer l'amour sincère des simples attachements",
            keywords: ["amour vrai", "authenticité", "signes", "attachement"],
            estimatedReadTime: 8
          },
          {
            title: "Se Relever d'une Rupture : Guide de Reconstruction Émotionnelle",
            description: "Étapes pour guérir et se reconstruire après une séparation",
            keywords: ["rupture", "guérison", "reconstruction", "émotions"],
            estimatedReadTime: 9
          }
        );
      } else if (categoryLower.includes('tech') || categoryLower.includes('technologie') || categoryLower.includes('informatique')) {
        dynamicIdeas.push(
          {
            title: "Les 10 Innovations Tech qui Révolutionnent 2024",
            description: "Découvrez les technologies émergentes qui transforment notre monde",
            keywords: ["innovation", "technologie", "2024", "futur"],
            estimatedReadTime: 8
          },
          {
            title: "Intelligence Artificielle : Guide Complet pour Débutants",
            description: "Tout ce que vous devez savoir sur l'IA et ses applications",
            keywords: ["IA", "intelligence artificielle", "débutant", "guide"],
            estimatedReadTime: 10
          },
          {
            title: "Cybersécurité : Protégez-vous dans le Monde Numérique",
            description: "Conseils pratiques pour sécuriser vos données en ligne",
            keywords: ["cybersécurité", "sécurité", "protection", "données"],
            estimatedReadTime: 7
          },
          {
            title: "Le Futur du Travail : Télétravail et Collaboration Virtuelle",
            description: "Comment s'adapter aux nouvelles formes de travail à distance",
            keywords: ["télétravail", "collaboration", "futur", "travail"],
            estimatedReadTime: 6
          },
          {
            title: "Blockchain et Cryptomonnaies : Comprendre la Révolution Financière",
            description: "Explication simple des technologies blockchain et leurs impacts",
            keywords: ["blockchain", "cryptomonnaies", "finance", "innovation"],
            estimatedReadTime: 9
          }
        );
      } else if (categoryLower.includes('santé') || categoryLower.includes('sante') || categoryLower.includes('health') || categoryLower.includes('bien-être')) {
        dynamicIdeas.push(
          {
            title: "Bien-être Mental : Stratégies pour une Vie Équilibrée",
            description: "Techniques pratiques pour maintenir une santé mentale optimale",
            keywords: ["bien-être", "santé mentale", "équilibre", "stratégies"],
            estimatedReadTime: 8
          },
          {
            title: "Nutrition et Santé : Les Fondamentaux d'une Alimentation Saine",
            description: "Guide complet pour adopter une alimentation équilibrée",
            keywords: ["nutrition", "santé", "alimentation", "équilibre"],
            estimatedReadTime: 9
          },
          {
            title: "Fitness à Domicile : Exercices sans Équipement",
            description: "Programme d'entraînement efficace pour rester en forme chez soi",
            keywords: ["fitness", "exercices", "maison", "santé"],
            estimatedReadTime: 7
          },
          {
            title: "Sommeil de Qualité : Les Clés d'une Nuit Réparatrice",
            description: "Conseils pour améliorer la qualité de votre sommeil",
            keywords: ["sommeil", "qualité", "repos", "conseils"],
            estimatedReadTime: 6
          },
          {
            title: "Gestion du Stress : Techniques de Relaxation Efficaces",
            description: "Méthodes éprouvées pour réduire le stress quotidien",
            keywords: ["stress", "relaxation", "gestion", "techniques"],
            estimatedReadTime: 8
          }
        );
      } else if (categoryLower.includes('business') || categoryLower.includes('entreprise') || categoryLower.includes('travail') || categoryLower.includes('professionnel')) {
        dynamicIdeas.push(
          {
            title: "Entrepreneuriat : Créer votre Entreprise en 2024",
            description: "Guide étape par étape pour lancer votre projet entrepreneurial",
            keywords: ["entrepreneuriat", "création", "entreprise", "2024"],
            estimatedReadTime: 10
          },
          {
            title: "Marketing Digital : Stratégies pour Croître en Ligne",
            description: "Techniques modernes pour développer votre présence digitale",
            keywords: ["marketing", "digital", "stratégies", "croissance"],
            estimatedReadTime: 8
          },
          {
            title: "Leadership Efficace : Inspirer et Motiver vos Équipes",
            description: "Compétences essentielles pour devenir un leader inspirant",
            keywords: ["leadership", "équipe", "motivation", "inspiration"],
            estimatedReadTime: 7
          },
          {
            title: "Productivité au Travail : Optimisez votre Temps",
            description: "Méthodes pour maximiser votre efficacité professionnelle",
            keywords: ["productivité", "travail", "efficacité", "temps"],
            estimatedReadTime: 6
          },
          {
            title: "Finance Personnelle : Gérez votre Argent Intelligemment",
            description: "Conseils pratiques pour une gestion financière responsable",
            keywords: ["finance", "argent", "gestion", "conseils"],
            estimatedReadTime: 8
          }
        );
      } else if (categoryLower.includes('lifestyle') || categoryLower.includes('mode de vie') || categoryLower.includes('personnel') || categoryLower.includes('développement')) {
        dynamicIdeas.push(
          {
            title: "Développement Personnel : Transformez votre Vie",
            description: "Stratégies pour atteindre vos objectifs et réaliser vos rêves",
            keywords: ["développement", "personnel", "objectifs", "transformation"],
            estimatedReadTime: 8
          },
          {
            title: "Organisation et Minimalisme : Simplifiez votre Espace",
            description: "Comment désencombrer et organiser votre environnement",
            keywords: ["organisation", "minimalisme", "simplicité", "espace"],
            estimatedReadTime: 6
          },
          {
            title: "Voyage et Découverte : Planifiez vos Aventures",
            description: "Conseils pour organiser des voyages mémorables et abordables",
            keywords: ["voyage", "découverte", "aventure", "planification"],
            estimatedReadTime: 7
          },
          {
            title: "Créativité et Inspiration : Développez votre Potentiel Artistique",
            description: "Techniques pour stimuler votre créativité au quotidien",
            keywords: ["créativité", "inspiration", "art", "potentiel"],
            estimatedReadTime: 6
          },
          {
            title: "Relations et Communication : Construisez des Liens Durables",
            description: "Améliorez vos relations personnelles et professionnelles",
            keywords: ["relations", "communication", "liens", "amélioration"],
            estimatedReadTime: 8
          }
        );
      } else {
        // Generic ideas for unknown categories
        dynamicIdeas.push(
          {
            title: `Guide Complet sur ${cat}`,
            description: `Tout ce que vous devez savoir sur ${cat} et ses aspects essentiels`,
            keywords: [cat.toLowerCase(), "guide", "complet", "essentiel"],
            estimatedReadTime: 8
          },
          {
            title: `Les Meilleures Pratiques en ${cat}`,
            description: `Découvrez les pratiques optimales pour exceller dans ${cat}`,
            keywords: [cat.toLowerCase(), "pratiques", "excellence", "optimisation"],
            estimatedReadTime: 7
          },
          {
            title: `${cat} : Tendances et Innovations`,
            description: `Explorez les dernières tendances et innovations dans le domaine de ${cat}`,
            keywords: [cat.toLowerCase(), "tendances", "innovations", "développement"],
            estimatedReadTime: 6
          },
          {
            title: `Comment Débuter dans ${cat}`,
            description: `Guide étape par étape pour commencer votre parcours dans ${cat}`,
            keywords: [cat.toLowerCase(), "débutant", "commencer", "parcours"],
            estimatedReadTime: 8
          },
          {
            title: `${cat} : Conseils d'Experts`,
            description: `Conseils et astuces d'experts pour maîtriser ${cat}`,
            keywords: [cat.toLowerCase(), "experts", "conseils", "astuces"],
            estimatedReadTime: 7
          }
        );
      }
      
      return dynamicIdeas;
    };

    try {
      console.log('GPT Service: Generating ideas for category:', category);
      
      const categoryText = category ? `pour la catégorie "${category}"` : 'générales';
      const prompt = `Génère ${count} idées d'articles de blog créatives et engageantes ${categoryText}.
      
      IMPORTANT: Les idées doivent être spécifiquement adaptées à la catégorie "${category || 'générale'}" si une catégorie est spécifiée.
      
      Chaque idée doit:
      - Être pertinente pour la catégorie "${category}"
      - Avoir un titre accrocheur et spécifique
      - Inclure une description claire de l'article
      - Contenir des mots-clés pertinents pour la catégorie
      - Avoir un temps de lecture réaliste
      
      Format de réponse: JSON avec un tableau d'idées:
      [
        {
          "title": "Titre de l'article",
          "description": "Description courte de l'article",
          "keywords": ["mot-clé1", "mot-clé2"],
          "estimatedReadTime": 5
        }
      ]`;

      console.log('GPT Service: Sending request with prompt:', prompt);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en stratégie de contenu de blog spécialisé dans la catégorie "${category}". Tu dois générer des idées d'articles spécifiquement adaptées à cette catégorie, avec des titres accrocheurs et des descriptions pertinentes.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('GPT Service: Raw API response:', data);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('GPT Service: Content received:', content);
        
        try {
          const parsedContent = JSON.parse(content);
          console.log('GPT Service: Parsed content:', parsedContent);
          return {
            success: true,
            data: parsedContent
          };
        } catch (parseError) {
          console.error('GPT Service: Parse error:', parseError);
          console.error('GPT Service: Raw content that failed to parse:', content);
          
          // Return category-specific fallback ideas if parsing fails
          const fallbackIdeas = generateDynamicIdeas(category);
          return {
            success: true,
            data: fallbackIdeas.slice(0, count),
            fallback: true,
            error: 'Failed to parse article ideas: ' + parseError.message
          };
        }
      } else {
        console.error('GPT Service: Invalid response format:', data);
        throw new Error('Invalid response format from API');
      }

    } catch (error) {
      console.error('GPT Service: Error generating article ideas:', error);
      console.log('GPT Service: Using category-specific fallback ideas due to API error');
      
      // Return category-specific fallback ideas if API fails
      const fallbackIdeas = generateDynamicIdeas(category);
      return {
        success: true,
        data: fallbackIdeas.slice(0, count),
        fallback: true,
        error: error.message
      };
    }
  }

  // Enhance existing article content
  async enhanceArticle(content, enhancementType = 'improve') {
    try {
      const enhancementPrompts = {
        'improve': 'Améliore la qualité, la fluidité et l\'engagement de cet article',
        'expand': 'Développe et enrichis cet article avec plus de détails et d\'exemples',
        'simplify': 'Simplifie et clarifie cet article pour une meilleure compréhension',
        'professional': 'Rends cet article plus professionnel et académique',
        'casual': 'Rends cet article plus décontracté et conversationnel'
      };

      const prompt = `${enhancementPrompts[enhancementType] || enhancementPrompts.improve}:
      
      Article original:
      ${content}
      
      Retourne l'article amélioré dans le même format.`;

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en amélioration de contenu de blog.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.6
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return {
          success: true,
          data: data.choices[0].message.content
        };
      }

    } catch (error) {
      console.error('Error enhancing article:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Generate SEO meta description
  async generateSEOMeta(title, content) {
    try {
      const prompt = `Génère une meta description SEO optimisée pour cet article:
      
      Titre: ${title}
      Contenu: ${content.substring(0, 500)}...
      
      La meta description doit:
      - Être entre 150-160 caractères
      - Être engageante et descriptive
      - Inclure des mots-clés pertinents
      - Inciter au clic
      
      Retourne seulement la meta description.`;

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en SEO.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return {
          success: true,
          data: data.choices[0].message.content.trim()
        };
      }

    } catch (error) {
      console.error('Error generating SEO meta:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Generate image using DALL-E
  async generateImage(prompt, style = 'realistic') {
    try {
      // Check if API key is available
      if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'your-openai-api-key-here') {
        return {
          success: false,
          error: 'OpenAI API key is not configured. Please set your API key in the Settings page or localStorage.',
          data: null
        };
      }
      // Map style to more descriptive prompts
      const styleDescriptions = {
        'realistic': 'style réaliste et photographique',
        'artistic': 'style artistique et créatif',
        'minimalist': 'style minimaliste et épuré',
        'modern': 'style moderne et contemporain',
        'vintage': 'style vintage et rétro'
      };

      const imagePrompt = `Crée une image professionnelle et attrayante pour un article de blog sur: ${prompt}. 
      
      Style: ${styleDescriptions[style] || styleDescriptions.realistic}
      L'image doit être:
      - De haute qualité et professionnelle
      - Adaptée à un article de blog
      - Visuellement engageante
      - En rapport direct avec le sujet
      - ${styleDescriptions[style] || styleDescriptions.realistic}
      
      Format: haute résolution, professionnel`;

      console.log('Generating image with prompt:', imagePrompt);

      // Try DALL-E-3 first, fallback to DALL-E-2 if access denied
      let requestBody = {
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
        response_format: 'b64_json' // Request base64 response instead of URL
      };
      
      console.log('📤 DALL-E API Request Body:', requestBody);
      console.log('🔍 Request parameters validation:', {
        hasModel: !!requestBody.model,
        hasPrompt: !!requestBody.prompt,
        hasResponseFormat: !!requestBody.response_format,
        responseFormat: requestBody.response_format,
        fullBody: requestBody
      });

      let response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      // If DALL-E-3 access is denied, try DALL-E-2
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DALL-E API Error:', response.status, errorText);
        
        // Check if it's an access denied error for DALL-E-3
        if (response.status === 403 && errorText.includes('dall-e-3')) {
          console.log('DALL-E-3 access denied, falling back to DALL-E-2...');
          
          // Modify request for DALL-E-2
          requestBody = {
            model: 'dall-e-2',
            prompt: imagePrompt.length > 1000 ? imagePrompt.substring(0, 1000) : imagePrompt, // DALL-E-2 has shorter prompt limit
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json'
            // Note: quality and style are not supported in DALL-E-2
          };
          
          console.log('📤 Fallback DALL-E-2 API Request Body:', requestBody);
          
          // Retry with DALL-E-2
          response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const fallbackErrorText = await response.text();
            console.error('DALL-E-2 Fallback API Error:', response.status, fallbackErrorText);
            throw new Error(`DALL-E API error (tried both DALL-E-3 and DALL-E-2): ${response.status} - ${fallbackErrorText}`);
          }
        } else {
          throw new Error(`DALL-E API error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('DALL-E API Response:', data);
      console.log('🔍 DALL-E Response Analysis:', {
        hasData: !!data.data,
        dataLength: data.data ? data.data.length : 0,
        firstItem: data.data && data.data[0] ? {
          hasB64Json: !!data.data[0].b64_json,
          b64JsonLength: data.data[0].b64_json ? data.data[0].b64_json.length : 0,
          hasUrl: !!data.data[0].url,
          url: data.data[0].url,
          fullFirstItem: data.data[0]
        } : null,
        fullResponse: data
      });
      
      if (data.data && data.data[0] && data.data[0].b64_json) {
        const base64Data = data.data[0].b64_json;
        console.log('OpenAI generated base64 image data received, length:', base64Data.length);
        console.log('🔍 Base64 data sample (first 100 chars):', base64Data.substring(0, 100));
        
        // Convert base64 to file and save locally
        try {
          const imageData = await this.saveBase64ImageAsFile(base64Data, prompt, requestBody.model);
          return {
            success: true,
            data: imageData
          };
        } catch (saveError) {
          console.error('Failed to save base64 image, falling back to data URL:', saveError);
          // Fallback: convert to data URL if file saving fails
          const dataUrl = `data:image/png;base64,${base64Data}`;
          return {
            success: true,
            data: {
              url: dataUrl,
              prompt: imagePrompt,
              style: style,
              isDataUrl: true,
              type: 'data_url_fallback',
              model: requestBody.model,
              alt: `Image générée par IA pour: ${prompt}`,
              caption: `Image générée automatiquement par ${requestBody.model.toUpperCase()}`
            }
          };
        }
      } else {
        console.error('Unexpected DALL-E response format:', data);
        console.error('🔍 Expected b64_json but found:', {
          hasData: !!data.data,
          dataLength: data.data ? data.data.length : 0,
          firstItemKeys: data.data && data.data[0] ? Object.keys(data.data[0]) : [],
          firstItem: data.data && data.data[0] ? data.data[0] : null
        });
        throw new Error('Invalid response format from DALL-E - no b64_json found');
      }

    } catch (error) {
      console.error('Error generating image with DALL-E:', error);
      
      // Provide more helpful error messages
      let userFriendlyError = error.message;
      if (error.message.includes('403') && error.message.includes('dall-e-3')) {
        userFriendlyError = 'Accès DALL-E-3 non disponible. Veuillez vérifier votre plan OpenAI ou contacter le support.';
      } else if (error.message.includes('quota')) {
        userFriendlyError = 'Quota API épuisé. Veuillez vérifier votre utilisation OpenAI.';
      } else if (error.message.includes('API key')) {
        userFriendlyError = 'Clé API OpenAI manquante ou invalide. Veuillez configurer votre clé API.';
      }
      
      return {
        success: false,
        error: userFriendlyError,
        originalError: error.message,
        data: null
      };
    }
  }

  // Test if uploads API is accessible
  async testUploadsAPI() {
    try {
      console.log('🧪 Testing uploads API accessibility...');
      
      // Test GET request to see if endpoint exists
      const testResponse = await fetch('/api/uploads/test.png');
      console.log('📡 Uploads API test response:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        exists: testResponse.status !== 404
      });
      
      return testResponse.status !== 404;
    } catch (error) {
      console.error('❌ Error testing uploads API:', error);
      return false;
    }
  }

  // Comprehensive test method for the new base64 approach
  async testBase64ImageHandling() {
    try {
      console.log('🧪 Testing comprehensive base64 image handling...');
      
      // Test 0: Check uploads API accessibility
      console.log('\n🔍 Test 0: Checking uploads API accessibility...');
      const uploadsAPIAccessible = await this.testUploadsAPI();
      if (!uploadsAPIAccessible) {
        console.warn('⚠️ Uploads API not accessible - images will use fallback blob URLs');
      } else {
        console.log('✅ Uploads API is accessible');
      }
      
      // Test 1: Generate image with base64 response
      console.log('\n📝 Test 1: Generating image with base64 response...');
      const testPrompt = 'A modern tech workspace with computer and plants';
      const result = await this.generateImage(testPrompt, 'modern');
      
      if (!result.success) {
        throw new Error(`Image generation failed: ${result.error}`);
      }
      
      console.log('✅ Image generated successfully');
      console.log('📊 Image data structure:', {
        url: result.data.url,
        urlType: this.getUrlType(result.data.url),
        filename: result.data.filename,
        size: result.data.size,
        isPermanent: result.data.isPermanent,
        isLocal: result.data.isLocal,
        prompt: result.data.prompt
      });
      
      // Test 2: Validate image URL accessibility
      console.log('\n🔍 Test 2: Validating image URL accessibility...');
      if (result.data.url) {
        try {
          const imgResponse = await fetch(result.data.url);
          if (imgResponse.ok) {
            console.log('✅ Image URL is accessible');
            console.log('📊 Response details:', {
              status: imgResponse.status,
              contentType: imgResponse.headers.get('content-type'),
              contentLength: imgResponse.headers.get('content-length')
            });
          } else {
            console.warn('⚠️ Image URL returned status:', imgResponse.status);
          }
        } catch (urlError) {
          console.warn('⚠️ Could not test image URL:', urlError.message);
        }
      }
      
      // Test 3: Test base64 to blob conversion
      console.log('\n🔄 Test 3: Testing base64 to blob conversion...');
      if (result.data.url && result.data.url.startsWith('data:image/')) {
        try {
          const blob = await this.dataUrlToBlob(result.data.url);
          console.log('✅ Base64 to blob conversion successful:', {
            blobSize: blob.size,
            blobType: blob.type
          });
          
          const file = await this.dataUrlToFile(result.data.url, 'test-conversion.png');
          console.log('✅ Base64 to file conversion successful:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });
          
        } catch (conversionError) {
          console.error('❌ Base64 conversion failed:', conversionError);
        }
      }
      
      // Test 4: Test file saving capabilities
      console.log('\n💾 Test 4: Testing file saving capabilities...');
      if (result.data.url && result.data.url.startsWith('blob:')) {
        console.log('ℹ️ Image is using blob URL (temporary)');
        console.log('💡 This image should be uploaded to server for permanent storage');
        if (!uploadsAPIAccessible) {
          console.log('⚠️ Uploads API not accessible - blob URL fallback is expected');
        }
      } else if (result.data.url && result.data.url.startsWith('/api/uploads/')) {
        console.log('✅ Image is permanently stored on server');
      } else if (result.data.isPermanent) {
        console.log('✅ Image is marked as permanent');
      }
      
      console.log('\n🎉 All tests completed successfully!');
      return {
        success: true,
        data: result.data,
        uploadsAPIAccessible,
        tests: {
          uploadsAPI: uploadsAPIAccessible ? 'passed' : 'failed',
          generation: 'passed',
          accessibility: 'passed',
          conversion: 'passed',
          storage: 'passed'
        }
      };
      
    } catch (error) {
      console.error('❌ Comprehensive test failed:', error);
      return { 
        success: false, 
        error: error.message,
        tests: {
          uploadsAPI: 'failed',
          generation: 'failed',
          accessibility: 'failed',
          conversion: 'failed',
          storage: 'failed'
        }
      };
    }
  }

  // Helper method to determine URL type
  getUrlType(url) {
    if (!url) return 'none';
    if (url.startsWith('data:image/')) return 'data-url';
    if (url.startsWith('blob:')) return 'blob-url';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'http-url';
    if (url.startsWith('/api/')) return 'api-url';
    return 'unknown';
  }

  // Cleanup method for blob URLs
  cleanupBlobUrl(blobUrl) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl);
        console.log('🧹 Blob URL cleaned up:', blobUrl);
      } catch (error) {
        console.warn('⚠️ Error cleaning up blob URL:', error);
      }
    }
  }

  // Download image and convert to data URL for storage
  async downloadAndConvertToDataUrl(openaiImageUrl, prompt) {
    try {
      console.log('📥 Downloading image from OpenAI...');
      
      // Download the image
      const imageResponse = await fetch(openaiImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.blob();
      console.log('📥 Image downloaded, size:', imageBlob.size, 'bytes');
      
      // Convert blob to data URL for storage
      const dataUrl = await this.blobToDataUrl(imageBlob);
      console.log('✅ Image converted to data URL');
      
      // Create a clean image object for storage
      const imageData = {
        url: dataUrl,
        filename: `gpt-generated-${Date.now()}.png`,
        size: imageBlob.size,
        type: 'image/png',
        prompt: prompt,
        style: 'realistic',
        isDataUrl: true,
        isPermanent: true,
        isOpenAIUrl: false,
        alt: `Image générée par IA pour: ${prompt}`,
        caption: `Image générée automatiquement par ${model.toUpperCase()}`
      };
      
      console.log('💾 Image data prepared for storage:', {
        hasUrl: !!imageData.url,
        size: imageData.size,
        type: imageData.type,
        isDataUrl: imageData.isDataUrl
      });
      
      return imageData;
      
    } catch (error) {
      console.error('❌ Error downloading/converting image:', error);
      throw error;
    }
  }

  // Convert blob to data URL
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert data URL back to blob/file (useful for storage)
  dataUrlToBlob(dataUrl) {
    return new Promise((resolve, reject) => {
      try {
        // Extract the base64 data from the data URL
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        
        // Create blob from the array
        const blob = new Blob([u8arr], { type: mime });
        resolve(blob);
      } catch (error) {
        reject(new Error('Failed to convert data URL to blob: ' + error.message));
      }
    });
  }

  // Convert data URL to File object
  async dataUrlToFile(dataUrl, filename = 'image.png') {
    try {
      const blob = await this.dataUrlToBlob(dataUrl);
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      throw new Error('Failed to convert data URL to file: ' + error.message);
    }
  }

  // Save base64 image data to a file
  async saveBase64ImageAsFile(base64Data, prompt, model = 'dall-e-3') {
    try {
      console.log('💾 Saving base64 image data to file...');
      
      // Validate base64 data
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid base64 data: must be a non-empty string');
      }
      
      // Check if base64 data looks valid
      if (base64Data.length < 100) {
        throw new Error('Base64 data too short to be a valid image');
      }
      
      // Check if it contains only valid base64 characters
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Data)) {
        throw new Error('Base64 data contains invalid characters');
      }
      
      console.log('✅ Base64 data validation passed, length:', base64Data.length);
      
      // Convert base64 to blob
      const imageBlob = await this.dataUrlToBlob(`data:image/png;base64,${base64Data}`);
      const filename = `gpt-generated-${Date.now()}.png`;
      
      console.log('📁 Image blob created:', {
        size: imageBlob.size,
        type: imageBlob.type,
        filename: filename
      });
      
      // Try to save to server via uploads API
      try {
        const formData = new FormData();
        formData.append('image', imageBlob, filename);
        formData.append('filename', filename);
        formData.append('source', 'gpt5-generation');
        formData.append('prompt', prompt);
        
        console.log('📤 Uploading image to server...');
        console.log('📊 Upload data:', {
          filename: filename,
          blobSize: imageBlob.size,
          blobType: imageBlob.type,
          formDataEntries: Array.from(formData.entries()).map(([key, value]) => [key, typeof value])
        });
        
        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
        });
        
        console.log('📤 Upload response received:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          ok: uploadResponse.ok,
          headers: Object.fromEntries(uploadResponse.headers.entries())
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          console.log('✅ Image uploaded successfully:', uploadResult);
          console.log('🔍 Upload result structure:', {
            hasUrl: !!uploadResult.url,
            url: uploadResult.url,
            urlType: typeof uploadResult.url,
            hasFilename: !!uploadResult.filename,
            filename: uploadResult.filename,
            hasSize: !!uploadResult.size,
            size: uploadResult.size,
            fullResult: uploadResult
          });
          
          // Return the permanent server URL
          const imageData = {
            url: uploadResult.url,
            filename: filename,
            size: imageBlob.size,
            type: 'image/png',
            prompt: prompt,
            style: 'realistic',
            isDataUrl: false,
            isPermanent: true,
            isOpenAIUrl: false,
            isLocal: true,
            alt: `Image générée par IA pour: ${prompt}`,
            caption: `Image générée automatiquement par ${model.toUpperCase()}`,
            serverPath: uploadResult.path || null
          };
          
          console.log('🎯 Final image data structure being returned:', imageData);
          console.log('🔍 URL validation check:', {
            startsWithApiUploads: imageData.url.startsWith('/api/uploads/'),
            startsWithUploads: imageData.url.startsWith('/uploads/'),
            startsWithHttp: imageData.url.startsWith('http'),
            startsWithData: imageData.url.startsWith('data:'),
            startsWithBlob: imageData.url.startsWith('blob:'),
            fullUrl: imageData.url
          });
          
          return imageData;
        } else {
          const errorText = await uploadResponse.text();
          console.error('❌ Upload failed with status:', uploadResponse.status);
          console.error('❌ Upload error response:', errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
        
      } catch (uploadError) {
        console.warn('⚠️ Server upload failed, using local blob URL as fallback:', uploadError);
        console.warn('⚠️ Upload error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          name: uploadError.name
        });
        
        // Fallback: create a local blob URL
        const file = new File([imageBlob], filename, { type: 'image/png' });
        const blobUrl = URL.createObjectURL(file);
        
        console.log('🔄 Created fallback blob URL:', blobUrl);
        
        return {
          url: blobUrl,
          filename: filename,
          size: file.size,
          type: file.type,
          prompt: prompt,
          style: 'realistic',
          isDataUrl: false,
          isPermanent: false,
          isOpenAIUrl: false,
          isLocal: false,
          alt: `Image générée par IA pour: ${prompt}`,
          caption: `Image générée automatiquement par ${model.toUpperCase()}`,
          blobUrl: blobUrl // Store reference for cleanup
        };
      }
      
      // Ultimate fallback: create data URL if everything else fails
      console.log('🔄 Creating ultimate fallback data URL...');
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      return {
        url: dataUrl,
        filename: filename,
        size: imageBlob.size,
        type: 'image/png',
        prompt: prompt,
        style: 'realistic',
        isDataUrl: true,
        isPermanent: false,
        isOpenAIUrl: false,
        isLocal: false,
        alt: `Image générée par IA pour: ${prompt}`,
        caption: `Image générée automatiquement par ${model.toUpperCase()}`,
        fallbackType: 'data-url'
      };
      
    } catch (error) {
      console.error('❌ Error saving base64 image as file:', error);
      throw new Error('Failed to save base64 image as file: ' + error.message);
    }
  }
}

// Export for global use
window.GPT5Service = GPT5Service;
