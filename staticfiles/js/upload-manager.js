/**
 * Upload Manager - Gerencia o upload e análise de imagens
 */

// Adicionar ao namespace ARITANA
if (window.ARITANA) {
    window.ARITANA.Upload = {
        /**
         * Inicializa o módulo de upload
         */
        init: function() {
            console.log('📤 Inicializando módulo de upload');
            this.setupEventListeners();
        },

        /**
         * Configura event listeners para upload
         */
        setupEventListeners: function() {
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');

            if (!uploadArea || !fileInput) {
                console.warn('⚠️ Elementos de upload não encontrados');
                return;
            }

            // Click na área de upload
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });

            // Seleção de arquivo via input
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        },

        /**
         * Processa arquivo selecionado
         */
        handleFileSelect: function(file) {
            // Validar arquivo
            if (!this.validateFile(file)) {
                return;
            }

            console.log('📤 Arquivo selecionado:', file.name);

            // Mostrar preview
            this.showPreview(file);

            // Simular upload (aqui você conectaria com o endpoint real)
            this.simulateUpload(file);
        },

        /**
         * Valida o arquivo selecionado
         */
        validateFile: function(file) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!allowedTypes.includes(file.type)) {
                ARITANA.showError('Formato de arquivo não suportado. Use PNG, JPG ou JPEG.');
                return false;
            }

            if (file.size > maxSize) {
                ARITANA.showError('Arquivo muito grande. Máximo de 10MB.');
                return false;
            }

            return true;
        },

        /**
         * Mostra preview da imagem
         */
        showPreview: function(file) {
            const previewContainer = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            const imageInfo = document.getElementById('imageInfo');

            if (!previewContainer || !previewImg) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
                
                if (imageInfo) {
                    imageInfo.textContent = `${file.name} (${ARITANA.formatBytes(file.size)})`;
                }
            };
            reader.readAsDataURL(file);
        },

        /**
         * Simula o processo de upload e análise
         */
        simulateUpload: async function(file) {
            const uploadContent = document.getElementById('uploadContent');
            const uploadLoading = document.getElementById('uploadLoading');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');

            // Mostrar estado de carregamento
            uploadContent.classList.add('hidden');
            uploadLoading.classList.remove('hidden');

            try {
                // Simular progresso de upload
                const steps = [
                    { progress: 20, text: 'Enviando imagem...' },
                    { progress: 40, text: 'Processando com IA...' },
                    { progress: 60, text: 'Analisando embarcação...' },
                    { progress: 80, text: 'Determinando legalidade...' },
                    { progress: 100, text: 'Análise concluída!' }
                ];

                for (const step of steps) {
                    await this.delay(1000);
                    if (progressBar) progressBar.style.width = `${step.progress}%`;
                    if (progressText) progressText.textContent = step.text;
                }

                // Simular resultado da análise
                await this.delay(500);
                this.showResults({
                    status: Math.random() > 0.5 ? 'legal' : 'irregular',
                    probabilidade: Math.random() * 30 + 70, // 70-100%
                    localizacao: {
                        lat: -1.4558 + (Math.random() - 0.5) * 0.1,
                        lon: -48.5034 + (Math.random() - 0.5) * 0.1
                    },
                    detalhes: {
                        tipo_embarcacao: 'Embarcação de pesca',
                        tamanho_estimado: '12-15m',
                        cor_predominante: 'Azul'
                    }
                });

                ARITANA.showNotification('Análise concluída com sucesso!', 'success');

            } catch (error) {
                console.error('❌ Erro no upload:', error);
                this.showError('Erro durante o processamento da imagem');
            }
        },

        /**
         * Mostra os resultados da análise
         */
        showResults: function(results) {
            // Atualizar seção de resultados
            if (ARITANA.Results && typeof ARITANA.Results.update === 'function') {
                ARITANA.Results.update(results);
            }

            // Atualizar mapa
            if (ARITANA.Map && typeof ARITANA.Map.addAnalysisMarker === 'function') {
                ARITANA.Map.addAnalysisMarker(results);
            }

            // Resetar estado de upload
            this.reset();
        },

        /**
         * Mostra erro no upload
         */
        showError: function(message) {
            const uploadContent = document.getElementById('uploadContent');
            const uploadLoading = document.getElementById('uploadLoading');
            const uploadError = document.getElementById('uploadError');
            const errorMessage = document.getElementById('errorMessage');

            uploadContent.classList.add('hidden');
            uploadLoading.classList.add('hidden');
            uploadError.classList.remove('hidden');

            if (errorMessage) {
                errorMessage.textContent = message;
            }
        },

        /**
         * Reseta o estado do upload
         */
        reset: function() {
            const uploadContent = document.getElementById('uploadContent');
            const uploadLoading = document.getElementById('uploadLoading');
            const uploadError = document.getElementById('uploadError');
            const progressBar = document.getElementById('progressBar');
            const fileInput = document.getElementById('fileInput');

            uploadContent.classList.remove('hidden');
            uploadLoading.classList.add('hidden');
            uploadError.classList.add('hidden');

            if (progressBar) progressBar.style.width = '0%';
            if (fileInput) fileInput.value = '';
        },

        /**
         * Remove imagem do preview
         */
        removeImage: function() {
            const previewContainer = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            const fileInput = document.getElementById('fileInput');

            if (previewContainer) previewContainer.classList.add('hidden');
            if (previewImg) previewImg.src = '';
            if (fileInput) fileInput.value = '';

            this.reset();
        },

        /**
         * Delay helper
         */
        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };
}

// Auto-inicializar quando o sistema principal estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (window.ARITANA && window.ARITANA.Upload) {
        setTimeout(() => {
            window.ARITANA.Upload.init();
        }, 300);
    }
}); 