/**
 * ARITANA Core System
 * Sistema de Identificação e Monitoramento de Embarcações
 * 
 * Arquivo principal que inicializa e coordena todos os componentes do sistema.
 */

// Namespace global do sistema ARITANA
window.ARITANA = {
    // Configurações globais
    config: {
        version: '1.0.0',
        apiBaseUrl: '/api',
        mapCenter: { lat: -1.4558, lon: -48.5034 },
        mapZoom: 11,
        uploadMaxSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['image/jpeg', 'image/jpg', 'image/png'],
        debugMode: false
    },

    // Estado global da aplicação
    state: {
        currentAnalysis: null,
        mapInstance: null,
        uploadInProgress: false,
        currentTab: 'principal',
        markers: [],
        statistics: null
    },

    // Dados passados do Django
    data: {},

    // Componentes do sistema
    Upload: null,
    Map: null,
    Statistics: null,
    UI: null,
    Results: null,
    Modal: null,

    // Módulo Core com funcionalidades principais
    Core: {
        /**
         * Inicializa o sistema ARITANA
         */
        init: function() {
            console.log('🚢 Inicializando Sistema ARITANA v' + ARITANA.config.version);
            
            try {
                // Configurar dados do Django se disponível
                if (typeof ARITANA_DATA !== 'undefined') {
                    ARITANA.data = ARITANA_DATA;
                    console.log('📊 Dados do contexto Django carregados');
                }

                // Inicializar componentes na ordem correta
                ARITANA.initializeComponents();
                ARITANA.setupEventListeners();
                ARITANA.loadInitialData();

                console.log('✅ Sistema ARITANA inicializado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao inicializar sistema ARITANA:', error);
                ARITANA.showError('Erro na inicialização do sistema');
            }
        },

        /**
         * Alterna entre as tabs do sistema
         */
        switchTab: function(tabName) {
            // Atualizar estado
            ARITANA.state.currentTab = tabName;

            // Atualizar visual das tabs
            const tabs = ['principal', 'localizacoes', 'graficos'];
            tabs.forEach(tab => {
                const tabElement = document.getElementById(`tab-${tab}`);
                if (tabElement) {
                    if (tab === tabName) {
                        tabElement.className = tabElement.className.replace('tab-inactive', 'tab-active');
                    } else {
                        tabElement.className = tabElement.className.replace('tab-active', 'tab-inactive');
                    }
                }
            });

            // Mostrar/ocultar seções correspondentes
            ARITANA.updateTabContent(tabName);

            // Log da mudança
            ARITANA.log(`Tab alterada para: ${tabName}`);
        }
    },

    /**
     * Inicializa o sistema ARITANA (método legacy)
     */
    init: function() {
        return this.Core.init();
    },

    /**
     * Inicializa todos os componentes do sistema
     */
    initializeComponents: function() {
        // Inicializar UI primeiro
        if (this.UI && typeof this.UI.init === 'function') {
            this.UI.init();
        }

        // Inicializar mapa
        if (this.Map && typeof this.Map.init === 'function') {
            this.Map.init();
        }

        // Inicializar upload
        if (this.Upload && typeof this.Upload.init === 'function') {
            this.Upload.init();
        }

        // Inicializar estatísticas
        if (this.Statistics && typeof this.Statistics.init === 'function') {
            this.Statistics.init();
        }

        // Inicializar resultados
        if (this.Results && typeof this.Results.init === 'function') {
            this.Results.init();
        }

        // Inicializar modal
        if (this.Modal && typeof this.Modal.init === 'function') {
            this.Modal.init();
        }
    },

    /**
     * Configura event listeners globais
     */
    setupEventListeners: function() {
        // Event listener para mudança de tabs
        const tabs = ['tab-principal', 'tab-localizacoes', 'tab-graficos'];
        
        tabs.forEach(tabId => {
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    ARITANA.Core.switchTab(tabId.replace('tab-', ''));
                });
            }
        });

        // Event listener para teclas de atalho
        document.addEventListener('keydown', (e) => {
            ARITANA.handleKeyboardShortcuts(e);
        });

        // Event listener para mudanças na conexão
        window.addEventListener('online', () => {
            ARITANA.handleConnectionChange(true);
        });

        window.addEventListener('offline', () => {
            ARITANA.handleConnectionChange(false);
        });

        // Event listener para beforeunload (avisar sobre uploads em progresso)
        window.addEventListener('beforeunload', (e) => {
            if (ARITANA.state.uploadInProgress) {
                e.preventDefault();
                e.returnValue = 'Há um upload em andamento. Tem certeza que deseja sair?';
                return e.returnValue;
            }
        });
    },

    /**
     * Carrega dados iniciais necessários
     */
    loadInitialData: async function() {
        try {
            // Carregar estatísticas gerais
            if (this.Statistics && typeof this.Statistics.loadData === 'function') {
                await this.Statistics.loadData();
            }

            // Carregar dados do mapa
            if (this.Map && typeof this.Map.loadMarkers === 'function') {
                await this.Map.loadMarkers();
            }

        } catch (error) {
            console.warn('⚠️ Erro ao carregar dados iniciais:', error);
        }
    },

    /**
     * Atualiza o conteúdo baseado na tab selecionada
     */
    updateTabContent: function(tabName) {
        const statsSection = document.getElementById('statsSection');
        
        switch (tabName) {
            case 'principal':
                if (statsSection) statsSection.classList.add('hidden');
                break;
                
            case 'localizacoes':
                if (statsSection) statsSection.classList.add('hidden');
                // Focar no mapa e atualizar dados
                if (this.Map && typeof this.Map.refresh === 'function') {
                    setTimeout(() => this.Map.refresh(), 100);
                }
                break;
                
            case 'graficos':
                if (statsSection) {
                    statsSection.classList.remove('hidden');
                    // Atualizar estatísticas quando mostrar a tab
                    if (this.Statistics && typeof this.Statistics.refresh === 'function') {
                        setTimeout(() => this.Statistics.refresh(), 100);
                    }
                }
                break;
        }
    },

    /**
     * Manipula atalhos do teclado
     */
    handleKeyboardShortcuts: function(e) {
        // Implementação básica de atalhos
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.Core.switchTab('principal');
                    break;
                case '2':
                    e.preventDefault();
                    this.Core.switchTab('localizacoes');
                    break;
                case '3':
                    e.preventDefault();
                    this.Core.switchTab('graficos');
                    break;
            }
        }
    },

    /**
     * Manipula mudanças na conexão
     */
    handleConnectionChange: function(isOnline) {
        if (isOnline) {
            this.showNotification('Conexão restaurada', 'success');
        } else {
            this.showNotification('Conexão perdida. Alguns recursos podem não funcionar.', 'warning', 0);
        }
    },

    /**
     * Exibe notificação para o usuário
     */
    showNotification: function(message, type = 'info', duration = 3000) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-fadeIn`;
        
        // Aplicar estilo baseado no tipo
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'text-white');
                break;
            default:
                notification.classList.add('bg-blue-500', 'text-white');
        }

        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i data-lucide="x" class="h-4 w-4"></i>
                </button>
            </div>
        `;

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Inicializar ícones se necessário
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Remover automaticamente após o tempo especificado
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    },

    /**
     * Exibe erro para o usuário
     */
    showError: function(message, details = null) {
        console.error('❌ ARITANA Error:', message, details);
        this.showNotification(message, 'error', 5000);
    },

    /**
     * Realiza requisição HTTP com tratamento de erro
     */
    request: async function(url, options = {}) {
        try {
            // Configurações padrão
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            };

            // Merge das opções
            const finalOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            };

            // Fazer a requisição
            const response = await fetch(url, finalOptions);

            // Verificar se a resposta é válida
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            // Retornar dados JSON se possível
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return response;

        } catch (error) {
            console.error('🌐 Erro na requisição:', error);
            throw error;
        }
    },

    /**
     * Obtém o token CSRF do Django
     */
    getCSRFToken: function() {
        // Tentar obter do contexto Django primeiro
        if (this.data && this.data.csrfToken) {
            return this.data.csrfToken;
        }

        // Fallback para cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return decodeURIComponent(value);
            }
        }

        return '';
    },

    /**
     * Formata bytes para formato legível
     */
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Formata data para exibição
     */
    formatDate: function(date, format = 'datetime') {
        const d = new Date(date);
        
        if (format === 'date') {
            return d.toLocaleDateString('pt-BR');
        } else if (format === 'time') {
            return d.toLocaleTimeString('pt-BR');
        } else {
            return d.toLocaleString('pt-BR');
        }
    },

    /**
     * Log personalizado do sistema
     */
    log: function(message, data = null) {
        if (this.config.debugMode) {
            console.log(`🚢 ARITANA: ${message}`, data);
        }
    },

    /**
     * Gera ID único
     */
    generateId: function() {
        return 'aritana_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Debounce para otimizar eventos frequentes
     */
    debounce: function(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }
};

// Inicialização automática quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Pequeno delay para garantir que todos os componentes estejam carregados
        setTimeout(() => ARITANA.init(), 100);
    });
} else {
    // DOM já está pronto
    setTimeout(() => ARITANA.init(), 100);
} 