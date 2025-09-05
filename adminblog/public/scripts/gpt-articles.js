// GPT-5 Articles Page Functionality
console.log('🚀 GPT-5 Articles script loading...');

class GPT5ArticlesManager {
  constructor() {
    console.log('GPT5ArticlesManager: Constructor started');
    try {
      this.gptService = new GPT5Service();
      console.log('GPT5ArticlesManager: GPT5Service initialized');
      this.currentArticle = null;
      this.initializeEventListeners();
      console.log('GPT5ArticlesManager: Event listeners initialized');
      this.loadUserCategories();
      console.log('GPT5ArticlesManager: Categories loaded');
      
      // Test API key validity
      this.testApiKeyAndUpdateUI();
      
      console.log('GPT5ArticlesManager: Constructor completed successfully');
    } catch (error) {
      console.error('GPT5ArticlesManager: Error in constructor:', error);
    }
  }

  initializeEventListeners() {
    // Generation type toggle
    const generationTypeRadios = document.querySelectorAll('input[name="generationType"]');
    generationTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.toggleGenerationType(e.target.value));
    });

    // Article generation form
    const gptArticleForm = document.getElementById('gptArticleForm');
    if (gptArticleForm) {
      gptArticleForm.addEventListener('submit', (e) => this.handleArticleGeneration(e));
    }

    // Generate ideas button
    const generateIdeasBtn = document.getElementById('generateIdeasBtn');
    if (generateIdeasBtn) {
      generateIdeasBtn.addEventListener('click', () => this.generateArticleIdeas());
    }

    // Enhance button
    const enhanceBtn = document.getElementById('enhanceBtn');
    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', () => this.enhanceArticle());
    }

    // Publish button
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => this.publishArticle());
    }
  }

  toggleGenerationType(type) {
    const promptSection = document.getElementById('promptSection');
    const titleSection = document.getElementById('titleSection');

    if (type === 'prompt') {
      promptSection.classList.remove('hidden');
      titleSection.classList.add('hidden');
    } else {
      promptSection.classList.add('hidden');
      titleSection.classList.remove('hidden');
    }
  }

  // Test API key validity and update UI accordingly
  async testApiKeyAndUpdateUI() {
    try {
      console.log('GPT5ArticlesManager: Testing API key...');
      const isValid = await this.gptService.testApiKey();
      
      console.log('GPT5ArticlesManager: API key test completed, valid:', isValid);
    } catch (error) {
      console.error('GPT5ArticlesManager: Error testing API key:', error);
    }
  }

  async handleArticleGeneration(e) {
    e.preventDefault();
    console.log('GPT5ArticlesManager: Article generation started');
    
    const formData = new FormData(e.target);
    const generationType = formData.get('generationType');
    const categorySelect = document.getElementById('articleCategory');
    const categoryId = categorySelect.value;
    
    // Get the category name from the selected option
    let categoryName = 'Uncategorized';
    if (categorySelect.selectedIndex > 0) { // Skip the first "Select category" option
      categoryName = categorySelect.options[categorySelect.selectedIndex].textContent;
    }
    
    const tone = document.getElementById('articleTone').value;
    const length = document.getElementById('articleLength').value;
    const imageStyle = document.getElementById('imageStyle').value;

    console.log('GPT5ArticlesManager: Form data:', {
      generationType,
      categoryId,
      categoryName,
      tone,
      length,
      imageStyle
    });

    if (!categoryId) {
      console.log('GPT5ArticlesManager: No category selected');
      this.showNotification('Choisissez une catégorie svp', 'error');
      return;
    }

    let prompt = '';
    let title = '';

    if (generationType === 'prompt') {
      prompt = document.getElementById('articlePrompt').value.trim();
      if (!prompt) {
        this.showNotification('Veuillez saisir un prompt de génération', 'error');
        return;
      }
    } else {
      title = document.getElementById('articleTitle').value.trim();
      if (!title) {
        this.showNotification('Veuillez saisir un titre d\'article', 'error');
        return;
      }
    }

    this.showLoadingState(true);

    try {
      // Generate article first
      const articleResult = await this.gptService.generateArticle(prompt, {
        title: title,
        category: categoryName, // Use categoryName for GPT prompt
        tone: tone,
        length: length,
        language: 'French'
      });

      console.log('🔍 GPT Article Result:', articleResult);
      console.log('🔍 Category being passed:', { categoryName, categoryId });

      if (!articleResult.success) {
        throw new Error(articleResult.error);
      }

      // Store the article with category information
      this.currentArticle = {
        ...articleResult.data,
        category: categoryName, // Store the actual category name
        categoryId: categoryId, // Store the category ID
        generatedImage: null // Will be set after image generation
      };

      console.log('🔍 Current article stored:', this.currentArticle);

      // Generate image based on article content
      const imagePrompt = title || prompt;
      console.log('Starting image generation for:', imagePrompt, 'with style:', imageStyle);
      
      let imageResult = null;
      try {
        imageResult = await this.gptService.generateImage(imagePrompt, imageStyle);
        console.log('Image generation result:', imageResult);
      } catch (imageError) {
        console.log('Image generation failed, continuing without image:', imageError);
        imageResult = { success: false, error: imageError.message };
      }

      if (imageResult && imageResult.success && imageResult.data && imageResult.data.url) {
        // Combine article and image
        this.currentArticle.generatedImage = imageResult.data;
        console.log('Article with generated image:', this.currentArticle);
        console.log('🔍 Generated image data structure:', {
          success: imageResult.success,
          hasData: !!imageResult.data,
          dataType: typeof imageResult.data,
          hasUrl: !!imageResult.data.url,
          url: imageResult.data.url,
          urlType: typeof imageResult.data.url,
          fullImageData: imageResult.data
        });
        
        // Validate image data before display
        if (this.validateImageData(imageResult.data)) {
          this.displayGeneratedArticle(this.currentArticle);
          this.showNotification('Article et image générés avec succès !', 'success');
        } else {
          console.warn('Invalid image data, showing article without image');
          console.warn('Raw image result:', imageResult);
          console.warn('Image data that failed validation:', imageResult.data);
          this.currentArticle.generatedImage = null;
          this.displayGeneratedArticle(this.currentArticle);
          this.showNotification('Article généré avec succès, mais l\'image n\'a pas pu être affichée', 'warning');
        }
      } else {
        // If image generation fails, still show article
        console.log('Image generation failed, showing article without image');
        console.log('Image result structure:', {
          success: imageResult?.success,
          hasData: !!imageResult?.data,
          dataType: typeof imageResult?.data,
          hasUrl: !!imageResult?.data?.url,
          fullResult: imageResult
        });
        this.currentArticle.generatedImage = null; // Ensure it's null if image fails
        this.displayGeneratedArticle(this.currentArticle);
        
        if (imageResult && imageResult.error) {
          this.showNotification(`Article généré avec succès, mais échec de la génération d'image: ${imageResult.error}`, 'warning');
        } else {
          this.showNotification('Article généré avec succès !', 'success');
        }
      }

    } catch (error) {
      console.error('Error generating article:', error);
      
      // Show fallback article if generation fails
      try {
        const fallbackArticle = {
          title: title || 'Article de démonstration',
          content: `Ceci est un article de démonstration pour la catégorie "${categoryName}". 
          
          ${prompt ? `Basé sur votre prompt: "${prompt}"` : ''}
          
          En mode normal, cet article serait généré par l'IA GPT-5. Actuellement, l'API n'est pas disponible ou a rencontré une erreur.
          
          Erreur technique: ${error.message}
          
          Pour résoudre ce problème, vérifiez:
          1. La validité de votre clé API OpenAI
          2. Votre connexion internet
          3. Les limites de votre compte OpenAI`,
          excerpt: 'Article de démonstration - API non disponible',
          keywords: ['démo', 'erreur', 'api'],
          wordCount: 0,
          estimatedReadTime: 3,
          category: categoryName, // Add the selected category ID
          categoryId: categoryId // Add the selected category ID
        };
        
        this.currentArticle = fallbackArticle;
        this.displayGeneratedArticle(this.currentArticle);
        this.showNotification(`Article de démonstration affiché (erreur: ${error.message})`, 'warning');
      } catch (fallbackError) {
        this.showNotification(`Erreur lors de la génération: ${error.message}`, 'error');
      }
    } finally {
      this.showLoadingState(false);
    }
  }

  async generateArticleIdeas() {
    const category = document.getElementById('ideasCategory').value;
    
    console.log('GPT5ArticlesManager: Generating ideas for category:', category);
    console.log('GPT5ArticlesManager: GPT Service available:', !!this.gptService);
    
    // Validate category selection
    if (!category) {
      this.showNotification('Choisissez une catégorie svp', 'error');
      return;
    }
    
    this.showLoadingState(true);

    try {
      // Pass the category to the API
      console.log('GPT5ArticlesManager: Calling gptService.generateArticleIdeas...');
      const result = await this.gptService.generateArticleIdeas(category, 5);
      console.log('GPT5ArticlesManager: Ideas generation result:', result);

      if (result.success && result.data) {
        console.log('Generated ideas result:', result.data);
        this.displayArticleIdeas(result.data);
        
        this.showNotification(`Idées d'articles générées avec succès pour la catégorie: ${category} !`, 'success');
      } else {
        throw new Error(result.error || 'Erreur inconnue lors de la génération des idées');
      }

    } catch (error) {
      console.error('Error generating ideas:', error);
      
      // Show category-specific fallback ideas even if there's an error
      try {
        // Dynamic category-specific fallback ideas generator
        const generateDynamicFallbackIdeas = (cat) => {
          const categoryLower = cat.toLowerCase();
          const dynamicIdeas = [];
          
          if (categoryLower.includes('love') || categoryLower.includes('amour') || categoryLower.includes('relation')) {
            dynamicIdeas.push(
              {
                title: "Comment Construire une Relation Durable et Épanouie",
                description: "Les clés pour développer une relation amoureuse saine et épanouissante",
                keywords: ["amour", "relation", "durabilité", "épanouissement"],
                wordCount: 1200,
                estimatedReadTime: 8
              },
              {
                title: "Communication dans le Couple : Les Secrets d'une Entente Parfaite",
                description: "Techniques pour améliorer la communication et résoudre les conflits",
                keywords: ["communication", "couple", "entente", "conflits"],
                wordCount: 1000,
                estimatedReadTime: 7
              },
              {
                title: "Garder la Flamme Vivante : Idées Romantiques pour Tous les Jours",
                description: "Petits gestes et activités pour maintenir la passion au quotidien",
                keywords: ["romance", "passion", "quotidien", "flamme"],
                wordCount: 800,
                estimatedReadTime: 6
              }
            );
          } else if (categoryLower.includes('tech') || categoryLower.includes('technologie') || categoryLower.includes('informatique')) {
            dynamicIdeas.push(
              {
                title: "Les 10 Innovations Tech qui Révolutionnent 2024",
                description: "Découvrez les technologies émergentes qui transforment notre monde",
                keywords: ["innovation", "technologie", "2024", "futur"],
                wordCount: 1500,
                estimatedReadTime: 8
              },
              {
                title: "Intelligence Artificielle : Guide Complet pour Débutants",
                description: "Tout ce que vous devez savoir sur l'IA et ses applications",
                keywords: ["IA", "intelligence artificielle", "débutant", "guide"],
                wordCount: 2000,
                estimatedReadTime: 10
              },
              {
                title: "Cybersécurité : Protégez-vous dans le Monde Numérique",
                description: "Conseils pratiques pour sécuriser vos données en ligne",
                keywords: ["cybersécurité", "sécurité", "protection", "données"],
                estimatedReadTime: 7
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
              }
            );
          }
          
          return dynamicIdeas;
        };
        
        // Get category-specific fallback ideas
        const fallbackIdeas = generateDynamicFallbackIdeas(category);
        
        this.displayArticleIdeas(fallbackIdeas);
        this.showNotification(`Idées d'articles affichées pour la catégorie: ${category}`, 'info');
      } catch (fallbackError) {
        this.showNotification(`Erreur lors de la génération des idées: ${error.message}`, 'error');
      }
    } finally {
      this.showLoadingState(false);
    }
  }

  async enhanceArticle() {
    if (!this.currentArticle) {
      this.showNotification('Aucun article à améliorer', 'error');
      return;
    }

    this.showLoadingState(true);

    try {
      const result = await this.gptService.enhanceArticle(this.currentArticle.content, 'improve');

      if (result.success) {
        this.currentArticle.content = result.data;
        this.displayGeneratedArticle(this.currentArticle);
        this.showNotification('Article amélioré avec succès !', 'success');
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error enhancing article:', error);
      this.showNotification(`Erreur lors de l'amélioration: ${error.message}`, 'error');
    } finally {
      this.showLoadingState(false);
    }
  }

  // Cleanup method for blob URLs
  cleanupBlobUrls() {
    if (this.currentArticle && this.currentArticle.generatedImage && this.currentArticle.generatedImage.blobUrl) {
      if (typeof GPT5Service !== 'undefined') {
        GPT5Service.cleanupBlobUrl(this.currentArticle.generatedImage.blobUrl);
      }
    }
  }

  // Enhanced publish method with better image handling
  async publishArticle() {
    if (!this.currentArticle) {
      this.showNotification('Aucun article à publier', 'error');
      return;
    }

    try {
      console.log('🚀 Publishing article:', this.currentArticle);
      
      // Get the category ID from the current article
      const categoryId = this.currentArticle.categoryId;
      console.log('🔍 Publishing with category ID:', categoryId);
      
      if (!categoryId) {
        this.showNotification('Catégorie manquante pour la publication', 'error');
        return;
      }

      // Prepare the payload
      const payload = {
        title: this.currentArticle.title,
        content: this.currentArticle.content,
        excerpt: this.currentArticle.excerpt || '',
        category_id: categoryId, // Use the stored category ID
        author_id: 1, // Default author ID
        featured_image: this.currentArticle.generatedImage ? this.currentArticle.generatedImage.url : null,
        status: 'published',
      };

      console.log('📤 Publishing payload:', payload);
      console.log('🖼️ Featured image data:', this.currentArticle.generatedImage);

      // Cleanup blob URLs before publishing
      this.cleanupBlobUrls();

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Article published successfully:', result);
        this.showNotification('Article publié avec succès !', 'success');
        
        // Clear current article after successful publication
        this.currentArticle = null;
        
        // Hide the preview section
        const previewSection = document.getElementById('articlePreview');
        if (previewSection) {
          previewSection.classList.add('hidden');
        }
        
        // Reset the form
        const form = document.getElementById('gptArticleForm');
        if (form) {
          form.reset();
        }
        
      } else {
        const errorData = await response.json();
        console.error('❌ Publication failed:', errorData);
        this.showNotification(`Erreur lors de la publication: ${errorData.error || 'Erreur inconnue'}`, 'error');
      }

    } catch (error) {
      console.error('❌ Error publishing article:', error);
      this.showNotification(`Erreur lors de la publication: ${error.message}`, 'error');
    }
  }

  displayGeneratedArticle(article) {
    const previewSection = document.getElementById('articlePreview');
    const previewContent = document.getElementById('previewContent');

    console.log('🔍 Displaying article with data:', article);
    console.log('🔍 Article category:', article.category);
    console.log('🔍 Article categoryId:', article.categoryId);
    console.log('🔍 Article generatedImage:', article.generatedImage);

    if (previewSection && previewContent) {
      previewSection.classList.remove('hidden');
      
      // Ensure we have valid image data
      const hasValidImage = article.generatedImage && article.generatedImage.url && (
        article.generatedImage.url.startsWith('https://') || 
        article.generatedImage.url.startsWith('/api/uploads/') ||
        article.generatedImage.url.startsWith('data:image/') ||
        article.generatedImage.url.startsWith('blob:') ||
        article.generatedImage.isLocal === true
      );
      
      console.log('🔍 Image validation in display:', {
        hasGeneratedImage: !!article.generatedImage,
        hasUrl: !!(article.generatedImage && article.generatedImage.url),
        url: article.generatedImage ? article.generatedImage.url : 'none',
        startsWithHttps: article.generatedImage ? article.generatedImage.url.startsWith('https://') : false,
        startsWithApiUploads: article.generatedImage ? article.generatedImage.url.startsWith('/api/uploads/') : false,
        startsWithDataImage: article.generatedImage ? article.generatedImage.url.startsWith('data:image/') : false,
        startsWithBlob: article.generatedImage ? article.generatedImage.url.startsWith('blob:') : false,
        isLocal: article.generatedImage ? article.generatedImage.isLocal : false,
        hasValidImage: hasValidImage
      });
      
      // Additional validation for different URL types
      let imageDisplayError = false;
      if (hasValidImage) {
        if (article.generatedImage.url.startsWith('data:image/')) {
          try {
            // Validate data URL format
            const dataUrlRegex = /^data:image\/[a-zA-Z]+;base64,/;
            if (!dataUrlRegex.test(article.generatedImage.url)) {
              console.warn('Invalid data URL format');
              imageDisplayError = true;
            }
            
            // Check if data URL is not too long
            const maxDataUrlSize = 5 * 1024 * 1024; // 5MB
            if (article.generatedImage.url.length > maxDataUrlSize) {
              console.warn('Data URL too long');
              imageDisplayError = true;
            }
          } catch (e) {
            console.warn('Error validating data URL:', e);
            imageDisplayError = true;
          }
        } else if (article.generatedImage.url.startsWith('blob:')) {
          // Blob URLs are temporary and should be handled carefully
          console.log('⚠️ Using temporary blob URL for image display');
        }
      }
      
      const finalHasValidImage = hasValidImage && !imageDisplayError;
      
      console.log('🔍 Final image display decision:', {
        hasValidImage: hasValidImage,
        imageDisplayError: imageDisplayError,
        finalHasValidImage: finalHasValidImage
      });
      
      previewContent.innerHTML = `
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">${article.title}</h1>
          <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <span>📚 ${article.estimatedReadTime || 5} min de lecture</span>
            <span>📝 ${article.wordCount || article.content.split(' ').length} mots</span>
            <span>🏷️ ${article.keywords ? article.keywords.join(', ') : 'Aucun mot-clé'}</span>
            <span>📁 ${article.category || 'Catégorie non définie'}</span>
          </div>
          
          ${finalHasValidImage ? `
            <div class="mb-6">
              <h3 class="font-semibold text-gray-900 dark:text-white mb-3">🖼️ Image Générée:</h3>
              <div class="relative">
                <img src="${article.generatedImage.url}" alt="Image générée pour ${article.title}" 
                     class="w-full h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block'; console.error('Image failed to load:', this.src);"
                     onload="console.log('Image loaded successfully:', this.src);">
                <div class="hidden bg-gray-200 dark:bg-gray-600 w-full h-64 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <p class="text-gray-500 dark:text-gray-400 text-center">
                    <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Image non disponible
                  </p>
                </div>
                <div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                  Style: ${article.generatedImage.style || 'Réaliste'}
                </div>
                ${article.generatedImage.isOpenAIUrl ? `
                  <div class="absolute top-2 left-2 bg-orange-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    ⚠️ URL OpenAI (temporaire)
                  </div>
                ` : ''}
                ${article.generatedImage.isLocal ? `
                  <div class="absolute top-2 left-2 bg-green-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    ✅ Stockée localement
                  </div>
                ` : ''}
                ${article.generatedImage.isPermanent ? `
                  <div class="absolute top-2 left-2 bg-blue-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    💾 Stockée en base
                  </div>
                ` : ''}
                ${article.generatedImage.isDataUrl ? `
                  <div class="absolute top-2 left-2 bg-yellow-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    📄 Data URL (temporaire)
                  </div>
                ` : ''}
                ${article.generatedImage.url && article.generatedImage.url.startsWith('blob:') ? `
                  <div class="absolute top-2 left-2 bg-purple-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    🔄 Blob URL (temporaire)
                  </div>
                ` : ''}
                ${article.generatedImage.url && article.generatedImage.url.startsWith('/api/uploads/') ? `
                  <div class="absolute top-2 left-2 bg-indigo-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs">
                    🗂️ Serveur local
                  </div>
                ` : ''}
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Prompt: ${article.generatedImage.prompt || 'Image générée automatiquement'}
              </p>
              ${article.generatedImage.isOpenAIUrl ? `
                <p class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Cette image utilise une URL OpenAI temporaire qui peut expirer
                </p>
              ` : ''}
            </div>
          ` : '<div class="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"><p class="text-yellow-800 dark:text-yellow-200 text-sm">⚠️ Aucune image générée pour cet article</p></div>'}
          
          ${article.excerpt ? `
            <div class="mb-6">
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm overflow-hidden">
                <!-- Excerpt Header -->
                <div class="bg-blue-50 dark:bg-blue-800/40 px-6 py-4 border-b border-blue-200 dark:border-blue-600">
                  <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Résumé de l'Article
                  </h3>
                </div>
                
                <!-- Excerpt Content -->
                <div class="p-6">
                  <p class="text-blue-900 dark:text-blue-100 leading-relaxed text-lg bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-600">
                    ${article.excerpt}
                  </p>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="mb-6">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm overflow-hidden">
            <!-- Content Header -->
            <div class="bg-gray-50 dark:bg-gray-600 px-6 py-4 border-b border-gray-300 dark:border-gray-600">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <svg class="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Contenu de l'Article
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Article généré par GPT-5</p>
            </div>
            
            <!-- Article Content -->
            <div class="p-6">
              <div class="prose prose-lg dark:prose-invert max-w-none">
                <div class="whitespace-pre-wrap leading-relaxed text-base leading-7 text-gray-900 dark:text-white bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
                  ${article.content}
                </div>
              </div>
            </div>
          </div>
        </div>
        

      `;
    }
  }

  displayArticleIdeas(ideas) {
    const ideasContainer = document.getElementById('ideasContainer');
    
    if (ideasContainer && Array.isArray(ideas)) {
      ideasContainer.innerHTML = ideas.map((idea, index) => `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-3">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                  ${index + 1}
                </div>
                <h4 class="text-lg font-bold text-gray-900 dark:text-white">
                  ${idea.title}
                </h4>
              </div>
              <p class="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                ${idea.description}
              </p>
              <div class="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  ${idea.estimatedReadTime || 5} min
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  ${idea.wordCount || '~1500'} mots
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                  </svg>
                  ${idea.keywords ? idea.keywords.join(', ') : 'Aucun mot-clé'}
                </span>
              </div>
            </div>
            <button
              onclick="gptArticlesManager.useIdea('${idea.title}')"
              class="ml-2 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-150"
              title="Utiliser cette idée"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      `
      ).join('');
    }
  }

  useIdea(title) {
    // Switch to title generation mode and fill the title
    const titleRadio = document.querySelector('input[value="title"]');
    if (titleRadio) {
      titleRadio.checked = true;
      this.toggleGenerationType('title');
    }

    const titleInput = document.getElementById('articleTitle');
    if (titleInput) {
      titleInput.value = title;
    }

    // Scroll to the form
    document.getElementById('gptArticleForm').scrollIntoView({ behavior: 'smooth' });
  }

  showLoadingState(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.classList.toggle('hidden', !show);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Load user categories from API
  async loadUserCategories() {
    try {
      console.log('📁 Loading user categories from API...');
      
      // Fetch categories from API instead of localStorage
      const response = await fetch('/api/categories');
      console.log('📡 Categories API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📁 Categories API response data:', data);
      console.log('📁 Response structure:', {
        success: data.success,
        hasCategories: !!data.categories,
        categoriesType: Array.isArray(data.categories) ? 'array' : typeof data.categories,
        categoriesLength: Array.isArray(data.categories) ? data.categories.length : 'not array'
      });
      
      const userCategories = Array.isArray(data) ? data : (data?.categories || []);
      console.log('📁 Processed user categories:', userCategories);
      
      const articleCategorySelect = document.getElementById('articleCategory');
      const ideasCategorySelect = document.getElementById('ideasCategory');
      
      console.log('📁 Found dropdown elements:', {
        articleCategory: !!articleCategorySelect,
        ideasCategory: !!ideasCategorySelect
      });
      
      if (userCategories.length > 0) {
        // Update article category dropdown
        if (articleCategorySelect) {
          // Clear existing options except the first one
          const firstOption = articleCategorySelect.querySelector('option[value=""]');
          articleCategorySelect.innerHTML = '';
          
          // Re-add the first option
          if (firstOption) {
            articleCategorySelect.appendChild(firstOption);
          }
          
          // Add user categories
          userCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            articleCategorySelect.appendChild(option);
          });
        }
        
        // Update ideas category dropdown
        if (ideasCategorySelect) {
          // Clear existing options except the first one
          const firstOption = ideasCategorySelect.querySelector('option[value=""]');
          ideasCategorySelect.innerHTML = '';
          
          // Re-add the first option
          if (firstOption) {
            ideasCategorySelect.appendChild(firstOption);
          }
          
          // Add user categories
          userCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            ideasCategorySelect.appendChild(option);
          });
        }
        
        console.log('GPT5ArticlesManager: Categories loaded successfully:', userCategories.length);
      } else {
        console.log('GPT5ArticlesManager: No categories found in database');
        this.showNotification('Aucune catégorie trouvée dans la base de données', 'warning');
      }
    } catch (error) {
      console.error('GPT5ArticlesManager: Error loading categories:', error);
      this.showNotification(`Erreur lors du chargement des catégories: ${error.message}`, 'error');
      
      // Show error in the category dropdowns
      const articleCategorySelect = document.getElementById('articleCategory');
      const ideasCategorySelect = document.getElementById('ideasCategory');
      
      if (articleCategorySelect) {
        articleCategorySelect.innerHTML = '<option value="">Erreur de chargement des catégories</option>';
      }
      
      if (ideasCategorySelect) {
        ideasCategorySelect.innerHTML = '<option value="">Erreur de chargement des catégories</option>';
      }
    }
  }

  // Refresh categories when localStorage changes
  refreshCategories() {
    this.loadUserCategories();
  }

  // Validate image data from GPT generation
  validateImageData(imageData) {
    console.log('🔍 Starting image data validation with:', imageData);
    
    if (!imageData || typeof imageData !== 'object') {
      console.warn('Invalid image data: not an object');
      return false;
    }
    
    if (!imageData.url || typeof imageData.url !== 'string') {
      console.warn('Invalid image data: missing or invalid URL');
      return false;
    }
    
    // Check if it's a valid URL type
    const isValidDataUrl = imageData.url.startsWith('data:image/');
    const isValidHttpUrl = imageData.url.startsWith('http://') || imageData.url.startsWith('https://');
    const isValidServerPath = imageData.url.startsWith('/api/uploads/') || imageData.url.startsWith('/uploads/');
    const isValidBlobUrl = imageData.url.startsWith('blob:');
    
    console.log('🔍 URL validation results:', {
      url: imageData.url,
      isValidDataUrl: isValidDataUrl,
      isValidHttpUrl: isValidHttpUrl,
      isValidServerPath: isValidServerPath,
      isValidBlobUrl: isValidBlobUrl,
      urlLength: imageData.url.length,
      urlType: typeof imageData.url
    });
    
    if (!isValidDataUrl && !isValidHttpUrl && !isValidServerPath && !isValidBlobUrl) {
      console.warn('Invalid image data: URL is not a valid data URL, HTTP URL, server path, or blob URL');
      console.warn('URL received:', imageData.url);
      console.warn('URL type check results:', {
        isDataUrl: isValidDataUrl,
        isHttpUrl: isValidHttpUrl,
        isServerPath: isValidServerPath,
        isBlobUrl: isValidBlobUrl
      });
      return false;
    }
    
    // Additional validation for data URLs
    if (isValidDataUrl) {
      // Check if data URL is not too long (max 5MB)
      const maxDataUrlSize = 5 * 1024 * 1024; // 5MB
      if (imageData.url.length > maxDataUrlSize) {
        console.warn('Invalid image data: data URL too long');
        return false;
      }
    }
    
    // Log the URL type for debugging
    let urlType = 'unknown';
    if (isValidDataUrl) urlType = 'data-url';
    else if (isValidHttpUrl) urlType = 'http-url';
    else if (isValidServerPath) urlType = 'server-path';
    else if (isValidBlobUrl) urlType = 'blob-url';
    
    console.log('✅ Image data validation passed:', {
      hasUrl: !!imageData.url,
      urlType: urlType,
      url: imageData.url,
      size: imageData.size || 'unknown',
      isPermanent: imageData.isPermanent || false,
      isLocal: imageData.isLocal || false
    });
    
    return true;
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded - Initializing GPT5ArticlesManager...');
  window.gptArticlesManager = new GPT5ArticlesManager();
  console.log('✅ GPT5ArticlesManager initialized and assigned to window');
  
  // Listen for localStorage changes to refresh categories
  window.addEventListener('storage', (e) => {
    if (e.key === 'userCategories') {
      window.gptArticlesManager.refreshCategories();
    }
  });
  
  // Also listen for custom events (for same-tab updates)
  window.addEventListener('categoriesUpdated', () => {
    window.gptArticlesManager.refreshCategories();
  });
});