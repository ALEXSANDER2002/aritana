/**
 * Sistema de Cache de Navegação para ARITANA
 * Mantém dados em cache no frontend para navegação rápida
 */

/**
 * Formata data para o horário de Brasília (UTC-3)
 */
function formatarDataBrasil(dataStr) {
    if (!dataStr) return 'N/A';
    
    try {
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) return 'Data inválida';
        
        const opcoes = {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        return new Intl.DateTimeFormat('pt-BR', opcoes).format(data);
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataStr;
    }
}

class NavigationCache {
    constructor() {
        this.cache = {
            embarcacoes: null,
            estatisticas: null,
            lastUpdate: null,
            cacheTimeout: 10 * 60 * 1000 // 10 minutos (aumentado para melhor performance)
        };
        this.isLoading = false;
        this.loadingPromises = new Map();
        
        // Inicializar cache na primeira carga
        this.initializeCache();
    }
    
    /**
     * Inicializa cache em background
     */
    async initializeCache() {
        try {
            await this.loadData();
            console.log('Cache inicializado com sucesso');
        } catch (error) {
            console.warn('Erro ao inicializar cache:', error);
        }
    }

    /**
     * Verifica se o cache ainda é válido
     */
    isCacheValid() {
        if (!this.cache.embarcacoes || !this.cache.lastUpdate) {
            return false;
        }
        return (Date.now() - this.cache.lastUpdate) < this.cacheTimeout;
    }

    /**
     * Carrega dados da API com cache
     */
    async loadData(forceRefresh = false) {
        // Se já está carregando, retorna a promise existente
        if (this.isLoading) {
            return this.loadingPromises.get('data');
        }

        // Se cache é válido e não é refresh forçado, retorna cache
        if (this.isCacheValid() && !forceRefresh) {
            return {
                embarcacoes: this.cache.embarcacoes,
                estatisticas: this.cache.estatisticas
            };
        }

        // Marca como carregando
        this.isLoading = true;
        
        const loadPromise = this.fetchDataFromAPI();
        this.loadingPromises.set('data', loadPromise);

        try {
            const data = await loadPromise;
            
            // Atualiza cache
            this.cache.embarcacoes = data.embarcacoes;
            this.cache.estatisticas = data.estatisticas;
            this.cache.lastUpdate = Date.now();
            
            return data;
        } finally {
            this.isLoading = false;
            this.loadingPromises.delete('data');
        }
    }

    /**
     * Busca dados da API
     */
    async fetchDataFromAPI() {
        try {
            const response = await fetch('/api/cache/');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return {
                embarcacoes: data.embarcacoes || [],
                estatisticas: data.estatisticas || {}
            };
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            // Fallback para APIs individuais
            const [embarcacoesResponse, estatisticasResponse] = await Promise.all([
                fetch('/api/mapa/'),
                fetch('/api/graficos/')
            ]);

            const embarcacoes = await embarcacoesResponse.json();
            const estatisticas = await estatisticasResponse.json();

            return {
                embarcacoes: embarcacoes.embarcacoes || [],
                estatisticas: estatisticas
            };
        }
    }

    /**
     * Navega para uma página específica (otimizada)
     */
    async navigateToPage(pageName, pageNumber = 1) {
        console.log(`Navegação rápida para: ${pageName}`);
        
        const startTime = Date.now();
        
        try {
            // Carrega dados com cache inteligente
            const data = await this.loadData();
            
            // Atualiza conteúdo da página imediatamente
            this.updatePageContent(pageName, pageNumber, data);
            
            // Atualiza URL sem recarregar página
            const url = pageName === 'dashboard' ? '/' : '/historico/';
            history.pushState({page: pageName, pageNumber}, '', url);
            
            const loadTime = Date.now() - startTime;
            console.log(`Navegação concluída em ${loadTime}ms`);
            
        } catch (error) {
            console.error('Erro na navegação:', error);
            this.showError('Erro ao carregar dados. Tente novamente.');
        }
    }

    /**
     * Simula navegação instantânea
     */
    async simulateNavigation(pageName, pageNumber, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Aqui você pode atualizar o DOM diretamente
                // sem recarregar a página
                this.updatePageContent(pageName, pageNumber, data);
                resolve();
            }, 100); // Simula 100ms de processamento
        });
    }

    /**
     * Atualiza conteúdo da página
     */
    updatePageContent(pageName, pageNumber, data) {
        if (pageName === 'historico') {
            this.updateHistoricoPage(data.embarcacoes, pageNumber);
        } else if (pageName === 'dashboard') {
            this.updateDashboardPage(data.embarcacoes, data.estatisticas);
        }
    }

    /**
     * Atualiza página de histórico
     */
    updateHistoricoPage(embarcacoes, pageNumber) {
        const pageSize = 20;
        const startIndex = (pageNumber - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = embarcacoes.slice(startIndex, endIndex);

        // Atualiza tabela
        this.updateHistoricoTable(pageData);
        
        // Atualiza estatísticas
        this.updateHistoricoStats(embarcacoes);
        
        // Atualiza paginação
        this.updatePagination(embarcacoes.length, pageNumber, pageSize);
    }

    /**
     * Atualiza página do dashboard
     */
    updateDashboardPage(embarcacoes, estatisticas) {
        // Atualiza estatísticas
        this.updateDashboardStats(estatisticas);
        
        // Reinicializa componentes do dashboard imediatamente
        if (window.safeReinitializeDashboard) {
            window.safeReinitializeDashboard();
        } else if (window.debouncedReinitialize) {
            window.debouncedReinitialize();
        }
        
        console.log('Dashboard atualizado com cache');
    }

    /**
     * Atualiza estatísticas do dashboard
     */
    updateDashboardStats(estatisticas) {
        const totalElement = document.querySelector('.stat-total');
        const legalElement = document.querySelector('.stat-legal');
        const illegalElement = document.querySelector('.stat-illegal');

        if (totalElement && estatisticas && estatisticas.legalidade) {
            const total = estatisticas.legalidade.legais + estatisticas.legalidade.ilegais;
            this.animateCounter(totalElement, total);
        }

        if (legalElement && estatisticas && estatisticas.legalidade) {
            this.animateCounter(legalElement, estatisticas.legalidade.legais);
        }

        if (illegalElement && estatisticas && estatisticas.legalidade) {
            this.animateCounter(illegalElement, estatisticas.legalidade.ilegais);
        }
    }

    /**
     * Atualiza tabela do histórico
     */
    updateHistoricoTable(embarcacoes) {
        const tbody = document.querySelector('#tabela-embarcacoes tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        embarcacoes.forEach(embarcacao => {
            const row = this.createHistoricoRow(embarcacao);
            tbody.appendChild(row);
        });
    }

    /**
     * Cria linha da tabela de histórico
     */
    createHistoricoRow(embarcacao) {
        const row = document.createElement('tr');
        row.className = 'embarcacao-row';
        row.setAttribute('data-tipo', embarcacao.classificacao.toLowerCase());
        row.setAttribute('data-regiao', embarcacao.regiao);
        row.setAttribute('data-nome', embarcacao.localidade.toLowerCase());
        row.setAttribute('data-id', embarcacao.id);
        row.setAttribute('data-latitude', embarcacao.latitude);
        row.setAttribute('data-longitude', embarcacao.longitude);
        row.setAttribute('data-imagem', embarcacao.imagem_url || '');
        row.setAttribute('data-data-cadastro', embarcacao.data_cadastro);
        row.setAttribute('data-data-foto', embarcacao.data_foto || '');

        const classificacaoClass = embarcacao.classificacao.toLowerCase() === 'legal' ? 'bg-success' : 'bg-danger';
        const classificacaoText = embarcacao.classificacao.toLowerCase() === 'legal' ? '✅ Legal' : '⚠️ Ilegal';

        row.innerHTML = `
            <td><span class="fw-bold text-primary">#${embarcacao.id}</span></td>
            <td><strong>${embarcacao.localidade}</strong></td>
            <td><span class="badge badge-classificacao ${classificacaoClass}">${classificacaoText}</span></td>
            <td><span class="badge bg-info bg-opacity-75">${embarcacao.regiao}</span></td>
            <td>
                ${embarcacao.imagem_url ? 
                    `<button class="btn btn-sm btn-outline-info btn-action" onclick="verImagem('${embarcacao.id}')">
                        <i class="fas fa-image"></i>
                    </button>` :
                    `<span class="text-muted"><i class="fas fa-ban"></i> N/A</span>`
                }
            </td>
            <td>
                <div class="coords-info">
                    <div><strong>Cadastro:</strong> ${formatarDataBrasil(embarcacao.data_cadastro)}</div>
                    ${embarcacao.data_foto ? `<div><strong>Foto:</strong> ${formatarDataBrasil(embarcacao.data_foto)}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary btn-action" onclick="verDetalhes('${embarcacao.id}')">
                        <i class="fas fa-eye me-1"></i>Ver
                    </button>
                    <button class="btn btn-sm btn-info btn-action" onclick="verNoMapa('${embarcacao.id}')">
                        <i class="fas fa-map-marker-alt me-1"></i>Mapa
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    /**
     * Atualiza estatísticas do histórico
     */
    updateHistoricoStats(embarcacoes) {
        const total = embarcacoes.length;
        const legais = embarcacoes.filter(e => e.classificacao.toLowerCase() === 'legal').length;
        const ilegais = embarcacoes.filter(e => e.classificacao.toLowerCase() === 'ilegal').length;

        // Animação de contagem
        this.animateCounter('total-embarcacoes', total);
        this.animateCounter('embarcacoes-legais', legais);
        this.animateCounter('embarcacoes-ilegais', ilegais);
    }

    /**
     * Animação de contador
     */
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Atualiza paginação
     */
    updatePagination(totalItems, currentPage, pageSize) {
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginationContainer = document.querySelector('.pagination');
        
        if (!paginationContainer) return;

        // Remove paginação existente
        paginationContainer.innerHTML = '';

        // Adiciona botões de navegação
        if (currentPage > 1) {
            paginationContainer.appendChild(this.createPaginationButton('<<', 1, 'Primeira página'));
            paginationContainer.appendChild(this.createPaginationButton('<', currentPage - 1, 'Página anterior'));
        }

        // Adiciona números das páginas
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const button = this.createPaginationButton(i, i, `Página ${i}`);
            if (i === currentPage) {
                button.classList.add('active');
            }
            paginationContainer.appendChild(button);
        }

        if (currentPage < totalPages) {
            paginationContainer.appendChild(this.createPaginationButton('>', currentPage + 1, 'Próxima página'));
            paginationContainer.appendChild(this.createPaginationButton('>>', totalPages, 'Última página'));
        }
    }

    /**
     * Cria botão de paginação
     */
    createPaginationButton(text, page, title) {
        const li = document.createElement('li');
        li.className = 'page-item';
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        a.title = title;
        a.onclick = (e) => {
            e.preventDefault();
            this.navigateToPage('historico', page);
        };
        
        li.appendChild(a);
        return li;
    }

    /**
     * Mostra indicador de carregamento
     */
    showLoadingIndicator() {
        let indicator = document.getElementById('navigation-loading');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'navigation-loading';
            indicator.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
            indicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
            indicator.style.zIndex = '9999';
            indicator.innerHTML = `
                <div class="text-center text-white">
                    <div class="spinner-border mb-3" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p>Carregando dados...</p>
                </div>
            `;
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    /**
     * Esconde indicador de carregamento
     */
    hideLoadingIndicator() {
        const indicator = document.getElementById('navigation-loading');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Mostra erro
     */
    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '10000';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);

        // Remove após 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
}

// Instância global
window.navigationCache = new NavigationCache();

// Exportar funções globalmente
window.formatarDataBrasil = formatarDataBrasil;

// Inicializa cache na primeira carga
document.addEventListener('DOMContentLoaded', () => {
    // Carrega dados em background
    window.navigationCache.loadData();
});
