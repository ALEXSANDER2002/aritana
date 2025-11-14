/**
 * JavaScript otimizado para página de histórico
 * Carrega dados via AJAX com cache e paginação eficiente
 */

let currentPage = 1;
let isLoading = false;
let currentFilters = {
    tipo: '',
    regiao: '',
    busca: ''
};

// Cache local para evitar requisições desnecessárias
let localCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Formata data para o horário de Brasília (UTC-3)
 * @param {string} dataStr - Data em formato ISO (UTC)
 * @returns {string} Data formatada no horário de Brasília
 */
function formatarDataBrasil(dataStr) {
    if (!dataStr) return 'N/A';
    
    try {
        // Criar objeto Date a partir da string ISO
        const data = new Date(dataStr);
        
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
            return 'Data inválida';
        }
        
        // Opções de formatação para pt-BR com timezone de São Paulo
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
        
        // Formatar para pt-BR
        return new Intl.DateTimeFormat('pt-BR', opcoes).format(data);
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataStr;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Carregar dados iniciais
    carregarDadosHistorico();
    
    // Aplicar filtros em tempo real com debounce
    let debounceTimer;
    const filtroBusca = document.getElementById('filtro-busca');
    if (filtroBusca) {
        filtroBusca.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                aplicarFiltros();
            }, 300);
        });
    }
    
    const filtroTipo = document.getElementById('filtro-tipo');
    if (filtroTipo) {
        filtroTipo.addEventListener('change', aplicarFiltros);
    }
    
    const filtroRegiao = document.getElementById('filtro-regiao');
    if (filtroRegiao) {
        filtroRegiao.addEventListener('change', aplicarFiltros);
    }
    
    // Adicionar efeitos visuais
    adicionarEfeitosVisuais();
});

function adicionarEfeitosVisuais() {
    // Animação de contagem das estatísticas
    const statsCards = document.querySelectorAll('.stats-card');
    statsCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('animate__animated', 'animate__fadeInUp');
    });
}

function carregarDadosHistorico(page = 1) {
    if (isLoading) return;
    
    isLoading = true;
    currentPage = page;
    
    // Verificar cache local primeiro
    const cacheKey = `${page}_${currentFilters.tipo}_${currentFilters.regiao}_${currentFilters.busca}`;
    const cachedData = localCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        console.log('Usando cache local');
        processarDados(cachedData.data);
        isLoading = false;
        return;
    }
    
    // Mostrar loading
    mostrarLoading();
    
    // Preparar parâmetros
    const params = new URLSearchParams({
        page: page,
        page_size: 20,
        tipo: currentFilters.tipo,
        regiao: currentFilters.regiao,
        busca: currentFilters.busca
    });
    
    // Fazer requisição AJAX
    fetch(`/api/historico/?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                mostrarErro(data.error);
                return;
            }
            
            // Cachear dados localmente
            localCache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            processarDados(data);
            
            // Mostrar tempo de carregamento
            if (data.load_time) {
                console.log(`Dados carregados em ${data.load_time}s`);
            }
        })
        .catch(error => {
            console.error('Erro ao carregar dados:', error);
            mostrarErro('Erro ao carregar dados. Tente novamente.');
        })
        .finally(() => {
            isLoading = false;
            esconderLoading();
        });
}

function processarDados(data) {
    // Atualizar tabela
    atualizarTabela(data.embarcacoes);
    
    // Atualizar estatísticas com dados completos
    atualizarEstatisticas(data);
    
    // Atualizar paginação
    atualizarPaginacao(data);
    
    // Atualizar contador total
    const totalCountElement = document.getElementById('total-count');
    if (totalCountElement) {
        totalCountElement.textContent = data.total_count || 0;
    }
}

function aplicarFiltros() {
    currentFilters.tipo = document.getElementById('filtro-tipo').value;
    currentFilters.regiao = document.getElementById('filtro-regiao').value;
    currentFilters.busca = document.getElementById('filtro-busca').value;
    
    // Limpar cache local ao aplicar novos filtros
    localCache.clear();
    
    // Resetar para primeira página
    carregarDadosHistorico(1);
}

function atualizarEstatisticas(data) {
    // Usar totais da API se disponíveis, senão calcular da página atual
    let total = data.total_count || data.embarcacoes.length;
    let legais = data.total_legais || 0;
    let ilegais = data.total_ilegais || 0;
    
    // Se não vier da API, calcular da página atual (fallback)
    if (!data.total_legais && !data.total_ilegais) {
        data.embarcacoes.forEach(embarcacao => {
            const tipo = embarcacao.classificacao ? embarcacao.classificacao.toLowerCase() : '';
            if (tipo === 'legal') legais++;
            else if (tipo === 'ilegal') ilegais++;
        });
    }
    
    // Animação de contagem
    animarContagem('total-embarcacoes', total);
    animarContagem('embarcacoes-legais', legais);
    animarContagem('embarcacoes-ilegais', ilegais);
}

function animarContagem(elementId, valorFinal) {
    const elemento = document.getElementById(elementId);
    if (!elemento) return;
    
    const valorInicial = parseInt(elemento.textContent) || 0;
    const incremento = valorFinal > valorInicial ? 1 : -1;
    const duracao = 1000; // 1 segundo
    const passo = Math.abs(valorFinal - valorInicial) / (duracao / 50);
    
    let valorAtual = valorInicial;
    const timer = setInterval(() => {
        valorAtual += passo * incremento;
        if ((incremento > 0 && valorAtual >= valorFinal) || (incremento < 0 && valorAtual <= valorFinal)) {
            elemento.textContent = valorFinal;
            clearInterval(timer);
        } else {
            elemento.textContent = Math.round(valorAtual);
        }
    }, 50);
}

function gerarBadgeStatus(embarcacao) {
    const tipo = (embarcacao.classificacao || '').toLowerCase();
    const progresso = embarcacao.progresso || 0;
    const mensagem = embarcacao.mensagem_status || '';

    switch (tipo) {
        case 'processando':
            return `<span class="badge bg-warning text-dark">
                        <i class="fas fa-spinner fa-spin me-1"></i>
                        Processando ${progresso ? `(${progresso}%)` : ''}
                    </span>`;
        case 'pendente':
            return `<span class="badge bg-secondary text-dark" style="background-color:#e5e7eb !important; color:#374151 !important;">
                        <i class="fas fa-hourglass-half me-1"></i>Pendente
                    </span>`;
        case 'erro':
            return `<span class="badge bg-danger">
                        <i class="fas fa-exclamation-triangle me-1"></i>Erro
                    </span>`;
        case 'aprovada':
        case 'legal':
            return `<span class="badge bg-success">
                        <i class="fas fa-check-circle me-1"></i>Legal
                    </span>`;
        case 'rejeitada':
        case 'ilegal':
            return `<span class="badge bg-danger">
                        <i class="fas fa-times-circle me-1"></i>Ilegal
                    </span>`;
        case 'analisada':
            return `<span class="badge bg-info text-dark" style="background-color:#dbeafe !important; color:#1e3a8a !important;">
                        <i class="fas fa-search me-1"></i>Analisada
                    </span>`;
        default:
            return `<span class="badge bg-secondary text-dark" style="background-color:#d1d5db !important; color:#374151 !important;">
                        <i class="fas fa-info-circle me-1"></i>${embarcacao.status_local || 'Desconhecido'}
                    </span>`;
    }
}

function atualizarTabela(embarcacoes) {
    const tbody = document.querySelector('#tabela-embarcacoes tbody');
    if (!tbody) return;
    
    if (embarcacoes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-ship fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nenhuma embarcação encontrada</h5>
                    <p class="text-muted">Tente ajustar os filtros de busca.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    embarcacoes.forEach(embarcacao => {
        const row = document.createElement('tr');
        row.className = 'embarcacao-row';
        const classificacaoLower = embarcacao.classificacao ? embarcacao.classificacao.toLowerCase() : '';
        row.setAttribute('data-tipo', classificacaoLower);
        row.setAttribute('data-regiao', embarcacao.regiao || '');
        row.setAttribute('data-nome', embarcacao.localidade ? embarcacao.localidade.toLowerCase() : '');
        row.setAttribute('data-id', embarcacao.id || '');
        row.setAttribute('data-latitude', embarcacao.latitude || '');
        row.setAttribute('data-longitude', embarcacao.longitude || '');
        const imagemPreferencial = embarcacao.imagem_processada_url || embarcacao.imagem_url;
        row.setAttribute('data-imagem', imagemPreferencial || '');
        row.setAttribute('data-imagem-local', embarcacao.imagem_url || '');
        row.setAttribute('data-imagem-api', embarcacao.imagem_processada_url || (embarcacao.resultado_api && embarcacao.resultado_api.imagem_url) || '');
        row.setAttribute('data-data-cadastro', embarcacao.data_cadastro || '');
        row.setAttribute('data-data-foto', embarcacao.data_foto || '');
        row.setAttribute('data-status-local', embarcacao.status_local || '');
        row.setAttribute('data-mensagem-status', embarcacao.mensagem_status || '');
        row.setAttribute('data-progresso', embarcacao.progresso || '');
        row.setAttribute('data-classificacao', classificacaoLower);
        row.setAttribute('data-origem', embarcacao.origem || 'api');
        if (embarcacao.resultado_api && typeof embarcacao.resultado_api === 'object') {
            row.setAttribute('data-api-classificacao', embarcacao.resultado_api.classificacao || '');
            row.setAttribute('data-api-regiao', embarcacao.resultado_api.regiao || '');
            row.setAttribute('data-api-localidade', embarcacao.resultado_api.localidade || '');
            row.setAttribute('data-api-descricao', embarcacao.resultado_api.descricao || '');
            row.setAttribute('data-api-titulo', embarcacao.resultado_api.titulo || '');
            row.setAttribute('data-api-imagem', embarcacao.resultado_api.imagem_url || '');
        } else {
            row.setAttribute('data-api-classificacao', '');
            row.setAttribute('data-api-regiao', '');
            row.setAttribute('data-api-localidade', '');
            row.setAttribute('data-api-descricao', '');
            row.setAttribute('data-api-titulo', '');
            row.setAttribute('data-api-imagem', '');
        }
        row.setAttribute('data-resource-id', embarcacao.resource_id || '');
        row.setAttribute('data-mensagem-api', embarcacao.mensagem_status || '');
        row.setAttribute('data-job-id', embarcacao.job_id || '');
        
        row.innerHTML = `
            <td>
                <span class="fw-bold" style="color: #6b7280;">#${embarcacao.id || 'N/A'}</span>
            </td>
            <td>
                <strong style="color: #1f2937;">${embarcacao.localidade || 'N/A'}</strong>
            </td>
            <td>
                ${gerarBadgeStatus(embarcacao)}
            </td>
            <td>
                <span class="badge bg-secondary" style="background-color: #6b7280 !important;">
                    ${embarcacao.regiao || 'N/A'}
                </span>
            </td>
            <td>
                <div style="min-width: 180px;">
                    <div style="font-size: 0.875rem; color: #374151;">
                        <strong>Cadastro:</strong> ${embarcacao.data_cadastro ? formatarDataBrasil(embarcacao.data_cadastro) : 'N/A'}
                    </div>
                    ${embarcacao.data_foto ? `
                        <div style="font-size: 0.875rem; color: #6b7280; margin-top: 4px;">
                            <strong>Foto:</strong> ${formatarDataBrasil(embarcacao.data_foto)}
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="text-center">
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-sm btn-ver-detalhes" 
                            data-embarcacao-id="${embarcacao.id || ''}"
                            title="Ver detalhes"
                            style="background: #1f2937; border: 1px solid #1f2937; color: #ffffff;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-ver-mapa" 
                            data-latitude="${embarcacao.latitude || ''}"
                            data-longitude="${embarcacao.longitude || ''}"
                            data-localidade="${(embarcacao.localidade || 'N/A').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                            title="Ver no mapa"
                            style="background: #f3f4f6; border: 1px solid #d1d5db; color: #374151;">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    // Adicionar event listeners para os botões
    tbody.querySelectorAll('.btn-ver-detalhes').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-embarcacao-id');
            if (id && typeof window.verDetalhes === 'function') {
                window.verDetalhes(id);
            }
        });
    });
    
    tbody.querySelectorAll('.btn-ver-mapa').forEach(btn => {
        btn.addEventListener('click', function() {
            const lat = this.getAttribute('data-latitude');
            const lng = this.getAttribute('data-longitude');
            const localidade = this.getAttribute('data-localidade');
            if (lat && lng && typeof window.verNoMapa === 'function') {
                window.verNoMapa(lat, lng, localidade);
            }
        });
    });
}

function atualizarPaginacao(data) {
    const paginationContainer = document.querySelector('.pagination');
    const pageInfo = document.querySelector('#page-info');
    
    if (!paginationContainer) return;
    
    if (!data.total_pages || data.total_pages <= 1) {
        paginationContainer.innerHTML = '';
        if (pageInfo) {
            pageInfo.textContent = `${data.start_index || 0} a ${data.end_index || 0} de ${data.total_count || 0} embarcações`;
        }
        return;
    }
    
    let paginationHTML = '';
    
    // Botão primeira página
    if (data.has_previous) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="carregarDadosHistorico(1)" aria-label="Primeira página">
                    <span aria-hidden="true">&laquo;&laquo;</span>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="carregarDadosHistorico(${data.previous_page})" aria-label="Página anterior">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
    }
    
    // Números das páginas
    const startPage = Math.max(1, data.page - 2);
    const endPage = Math.min(data.total_pages, data.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === data.page) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="carregarDadosHistorico(${i})">${i}</a></li>`;
        }
    }
    
    // Botão próxima página
    if (data.has_next) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="carregarDadosHistorico(${data.next_page})" aria-label="Próxima página">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
            <li class="page-item">
                <a class="page-link" href="#" onclick="carregarDadosHistorico(${data.total_pages})" aria-label="Última página">
                    <span aria-hidden="true">&raquo;&raquo;</span>
                </a>
            </li>
        `;
    }
    
    paginationContainer.innerHTML = paginationHTML;
    
    if (pageInfo) {
        pageInfo.textContent = `${data.start_index || 0} a ${data.end_index || 0} de ${data.total_count || 0} embarcações`;
    }
}

function mostrarLoading() {
    const tbody = document.querySelector('#tabela-embarcacoes tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <p class="mt-2 text-muted">Carregando dados...</p>
            </td>
        </tr>
    `;
}

function esconderLoading() {
    // Loading será substituído pelos dados reais
}

function mostrarErro(mensagem) {
    const tbody = document.querySelector('#tabela-embarcacoes tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5 class="text-warning">Erro ao carregar dados</h5>
                <p class="text-muted">${mensagem}</p>
                <button class="btn btn-primary" onclick="carregarDadosHistorico(${currentPage})">
                    <i class="fas fa-redo me-1"></i>Tentar Novamente
                </button>
            </td>
        </tr>
    `;
}

// Funções para modais (mantidas do código original)
function verDetalhes(id) {
    console.log('verDetalhes chamado com ID:', id);
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) {
        console.error('Linha não encontrada para ID:', id);
        alert('Erro: Não foi possível encontrar os dados da embarcação.');
        return;
    }
    console.log('Linha encontrada:', row);
    
    const modalBody = document.getElementById('modal-body');
    const imagemUrl = row.dataset.imagem || row.dataset.imagemApi || row.dataset.imagemLocal;
    const latitude = row.dataset.latitude;
    const longitude = row.dataset.longitude;
    const dataCadastro = row.dataset.dataCadastro;
    const dataFoto = row.dataset.dataFoto;
    const statusLocal = row.dataset.statusLocal || '';
    const mensagemStatus = row.dataset.mensagemStatus || '';
    const progresso = parseInt(row.dataset.progresso || '0', 10) || 0;
    const classificacao = row.dataset.classificacao || '';
    const origem = row.dataset.origem || 'api';
    const apiClassificacao = row.dataset.apiClassificacao || '';
    const apiDescricao = row.dataset.apiDescricao || '';
    const apiTitulo = row.dataset.apiTitulo || row.cells[1].textContent;
    const resourceId = row.dataset.resourceId || '';
    const jobId = row.dataset.jobId || '';

    const badgeHtml = gerarBadgeStatus({
        classificacao,
        progresso,
        mensagem_status: mensagemStatus,
        status_local: statusLocal
    });
    
    // Escapar aspas para uso em atributos HTML
    const imagemUrlSafe = imagemUrl ? imagemUrl.replace(/'/g, '&apos;').replace(/"/g, '&quot;') : '';
    const imagemApiSafe = (row.dataset.imagemApi || '').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
    const tituloSafe = apiTitulo.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Informações Básicas</h6>
                    </div>
                    <div class="card-body">
                        <p><strong><i class="fas fa-hashtag me-1"></i>ID:</strong> ${id}</p>
                        <p><strong><i class="fas fa-map-marker-alt me-1"></i>Localidade:</strong> ${row.cells[1].textContent}</p>
                        <p><strong><i class="fas fa-tag me-1"></i>Status Local:</strong> ${statusLocal || 'N/A'}</p>
                        <div class="mb-2">${badgeHtml}</div>
                        ${apiClassificacao ? `<p><strong><i class="fas fa-robot me-1"></i>Classificação API:</strong> ${apiClassificacao}</p>` : ''}
                        <p><strong><i class="fas fa-globe me-1"></i>Região:</strong> ${row.cells[3].textContent}</p>
                        <p><strong><i class="fas fa-calendar me-1"></i>Data Cadastro:</strong> ${dataCadastro}</p>
                        ${dataFoto ? `<p><strong><i class="fas fa-camera me-1"></i>Data Foto:</strong> ${dataFoto}</p>` : ''}
                        ${mensagemStatus ? `<p><strong><i class="fas fa-comment-dots me-1"></i>Mensagem:</strong> ${mensagemStatus}</p>` : ''}
                        ${jobId ? `<p><strong><i class="fas fa-tasks me-1"></i>Job ID:</strong> ${jobId}</p>` : ''}
                        ${resourceId ? `<p><strong><i class="fas fa-database me-1"></i>Resource ID:</strong> ${resourceId}</p>` : ''}
                        ${apiDescricao ? `<p><strong><i class="fas fa-align-left me-1"></i>Descrição API:</strong> ${apiDescricao}</p>` : ''}
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0"><i class="fas fa-map me-2"></i>Localização</h6>
                    </div>
                    <div class="card-body">
                        <p><strong><i class="fas fa-compass me-1"></i>Coordenadas:</strong></p>
                        <div class="coords-info mb-3">
                            <div><strong>Latitude:</strong> ${latitude}</div>
                            <div><strong>Longitude:</strong> ${longitude}</div>
                        </div>
                        ${imagemUrl ? `
                            <div class="text-center d-grid gap-2">
                                <button class="btn btn-primary btn-ver-imagem-modal" 
                                        data-imagem-url="${imagemUrlSafe}" 
                                        data-titulo="${tituloSafe}">
                                    <i class="fas fa-image me-1"></i>Ver Imagem
                                </button>
                                <a class="btn btn-outline-primary" href="${imagemUrl}" download>
                                    <i class="fas fa-download me-1"></i>Baixar Imagem
                                </a>
                            </div>
                        ` : '<p class="text-muted"><i class="fas fa-ban me-1"></i>Nenhuma imagem disponível</p>'}
                        ${row.dataset.imagemApi && row.dataset.imagemApi !== imagemUrl ? `
                            <div class="text-center d-grid gap-2 mt-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="verImagem('${imagemApiSafe}', '${tituloSafe} - Processada')">
                                    <i class="fas fa-microchip me-1"></i>Ver Imagem Processada
                                </button>
                                <a class="btn btn-outline-primary btn-sm" href="${row.dataset.imagemApi || ''}" download>
                                    <i class="fas fa-download me-1"></i>Baixar Imagem Processada
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0"><i class="fas fa-map-marker-alt me-2"></i>Localização no Mapa</h6>
                    </div>
                    <div class="card-body">
                        <div id="mini-map" style="height: 300px; border-radius: 10px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Função para inicializar o mini mapa
    function inicializarMiniMapa() {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.error('Coordenadas inválidas:', latitude, longitude);
            return;
        }
        
        const miniMapContainer = document.getElementById('mini-map');
        if (!miniMapContainer) {
            console.error('Container mini-map não encontrado');
            return;
        }
        
        // Verificar se o container está visível
        if (miniMapContainer.offsetParent === null) {
            console.log('⏳ Container mini-map não está visível, aguardando...');
            setTimeout(() => inicializarMiniMapa(), 200);
            return;
        }
        
        // Verificar se já existe um mapa no container e removê-lo
        if (window.currentMiniMap) {
            console.log('🗑️ Removendo mapa anterior...');
            try {
                window.currentMiniMap.remove();
            } catch (error) {
                console.warn('Erro ao remover mapa anterior:', error);
            }
            window.currentMiniMap = null;
        }
        
        // Limpar o container
        miniMapContainer.innerHTML = '';
        
        try {
            const map = L.map('mini-map').setView([lat, lng], 15);
            // Armazenar referência do mapa
            window.currentMiniMap = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Marcador personalizado
            const marker = L.circleMarker([lat, lng], {
                color: row.dataset.tipo === 'legal' ? '#28a745' : '#dc3545',
                fillColor: row.dataset.tipo === 'legal' ? '#28a745' : '#dc3545',
                fillOpacity: 0.8,
                radius: 15,
                weight: 3
            }).addTo(map);
            
            const localidade = row.cells[1] ? row.cells[1].textContent : 'N/A';
            const statusBadge = row.cells[2] ? row.cells[2].innerHTML : '';
            
            marker.bindPopup(`
                <div style="text-align: center;">
                    <h6 style="margin: 0 0 10px 0;">${localidade}</h6>
                    ${statusBadge}
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        <strong>Coordenadas:</strong><br>
                        ${latitude}, ${longitude}
                    </div>
                </div>
            `).openPopup();
        } catch (error) {
            console.error('Erro ao criar mini-mapa:', error);
            if (miniMapContainer) {
                miniMapContainer.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center h-100">
                        <div class="text-center text-muted">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
                            <p>Erro ao carregar mapa</p>
                            <small>${error.message || 'Erro desconhecido'}</small>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Inicializar mini mapa (apenas se Leaflet estiver disponível)
    setTimeout(() => {
        // Verificar se Leaflet está carregado
        if (typeof L === 'undefined') {
            console.log('🔄 Leaflet não disponível, tentando carregar...');
            const loadLeafletFn = window.loadLeaflet;
            if (typeof loadLeafletFn === 'function') {
                loadLeafletFn()
                    .then(() => {
                        console.log('✅ Leaflet carregado, inicializando mini mapa...');
                        setTimeout(() => {
                            inicializarMiniMapa();
                        }, 200);
                    })
                    .catch(error => {
                        console.error('❌ Erro ao carregar Leaflet:', error);
                        const miniMapContainer = document.getElementById('mini-map');
                        if (miniMapContainer) {
                            miniMapContainer.innerHTML = `
                                <div class="d-flex align-items-center justify-content-center h-100">
                                    <div class="text-center text-muted">
                                        <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
                                        <p>Não foi possível carregar a biblioteca do mapa</p>
                                        <small>Coordenadas: ${latitude}, ${longitude}</small>
                                    </div>
                                </div>
                            `;
                        }
                    });
            } else {
                console.warn('⚠️ Função loadLeaflet não disponível');
                const miniMapContainer = document.getElementById('mini-map');
                if (miniMapContainer) {
                    miniMapContainer.innerHTML = `
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <div class="text-center text-muted">
                                <i class="fas fa-map-marked-alt fa-3x mb-3"></i>
                                <p>Mini-mapa indisponível</p>
                                <small>Coordenadas: ${latitude}, ${longitude}</small>
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            // Leaflet já está disponível, inicializar diretamente
            inicializarMiniMapa();
        }
    }, 100);
    
    // Mostrar modal
    const modalElement = document.getElementById('modalDetalhes');
    if (!modalElement) {
        console.error('Modal #modalDetalhes não encontrado no DOM');
        alert('Erro: Modal de detalhes não encontrado.');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap não está disponível');
        alert('Erro: Bootstrap não carregado.');
        return;
    }
    
    console.log('Abrindo modal de detalhes...');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Limpar mapa quando o modal for fechado
    modalElement.addEventListener('hidden.bs.modal', function() {
        if (window.currentMiniMap) {
            console.log('🗑️ Limpando mini mapa ao fechar modal...');
            try {
                window.currentMiniMap.remove();
            } catch (error) {
                console.warn('Erro ao remover mini mapa:', error);
            }
            window.currentMiniMap = null;
        }
    });
    
    // Adicionar event listener para o botão "Ver Imagem" no modal após ele ser exibido
    modalElement.addEventListener('shown.bs.modal', function() {
        const btnVerImagem = modalElement.querySelector('.btn-ver-imagem-modal');
        if (btnVerImagem) {
            btnVerImagem.addEventListener('click', function() {
                const imagemUrl = this.getAttribute('data-imagem-url');
                const titulo = this.getAttribute('data-titulo');
                if (imagemUrl && typeof window.verImagem === 'function') {
                    window.verImagem(imagemUrl, titulo);
                }
            });
        }
    }, { once: true });
    
    console.log('Modal aberto com sucesso');
}

function verImagem(url, titulo) {
    console.log('verImagem chamada com:', { url, titulo });
    
    const imgElement = document.getElementById('imagem-embarcacao');
    const tituloElement = document.getElementById('imagem-titulo');
    const linkElement = document.getElementById('link-imagem-original');
    
    if (!imgElement) {
        console.error('Elemento #imagem-embarcacao não encontrado');
        alert('Erro: Elemento de imagem não encontrado no DOM.');
        return;
    }
    if (!tituloElement) {
        console.error('Elemento #imagem-titulo não encontrado');
        alert('Erro: Elemento de título não encontrado no DOM.');
        return;
    }
    if (!linkElement) {
        console.error('Elemento #link-imagem-original não encontrado');
        alert('Erro: Elemento de link não encontrado no DOM.');
        return;
    }
    
    if (!url) {
        console.error('URL da imagem não fornecida');
        alert('Erro: URL da imagem não foi fornecida.');
        return;
    }
    
    // Converter HTTP para HTTPS se necessário (Railway redireciona)
    if (url && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
        console.log('URL convertida para HTTPS:', url);
    }
    if (url && url.startsWith('/')) {
        url = `${window.location.origin}${url}`;
        console.log('URL relativa convertida para absoluta:', url);
    }
    
    console.log('URL final da imagem:', url);
    
    // Resetar imagem
    imgElement.src = '';
    imgElement.style.display = 'none';
    
    // Mostrar loading
    tituloElement.innerHTML = `<div class="spinner-border" style="color: #6b7280;" role="status"><span class="visually-hidden">Carregando...</span></div><p class="mt-2" style="color: #6b7280;">Carregando imagem...</p>`;
    
    // Handler de erro
    imgElement.onerror = function() {
        console.error('Erro ao carregar imagem:', url);
        tituloElement.innerHTML = `
            <div class="alert alert-danger" style="background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b;">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Erro ao carregar imagem</strong>
                <p class="mb-0 mt-2">A imagem não pôde ser carregada. Ela pode ter sido removida do servidor.</p>
                <small class="text-muted d-block mt-2">URL: ${url}</small>
            </div>
        `;
        imgElement.style.display = 'none';
    };
    
    // Handler de sucesso
    imgElement.onload = function() {
        console.log('Imagem carregada com sucesso:', url);
        imgElement.style.display = 'inline-block';
        tituloElement.innerHTML = `<strong style="color: #1f2937;">Imagem de: ${titulo}</strong>`;
    };
    
    // Definir src e link
    imgElement.src = url;
    linkElement.href = url;
    
    // Verificar se o modal existe
    const modalElement = document.getElementById('modalImagem');
    if (!modalElement) {
        console.error('Modal #modalImagem não encontrado');
        alert('Erro: Modal de imagem não encontrado no DOM.');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap não está disponível');
        alert('Erro: Bootstrap não carregado.');
        return;
    }
    
    console.log('Abrindo modal de imagem...');
    // Abrir modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    console.log('Modal de imagem aberto com sucesso');
}

// Exportar funções globalmente (sobrescrever funções do dashboard.js)
window.formatarDataBrasil = formatarDataBrasil;
window.verImagem = verImagem;
window.verDetalhes = verDetalhes;
window.verNoMapa = verNoMapa;

// Log para confirmar carregamento
console.log('✅ historico-optimized.js carregado com sucesso');
console.log('📦 Funções globais exportadas:', {
    formatarDataBrasil: typeof window.formatarDataBrasil,
    verImagem: typeof window.verImagem,
    verDetalhes: typeof window.verDetalhes,
    verNoMapa: typeof window.verNoMapa
});
console.log('🔄 Sobrescrevendo funções do dashboard.js para o histórico');

function verNoMapa(latitude, longitude, titulo) {
    const modalBody = document.getElementById('coordenadas-info');
    if (modalBody) {
        modalBody.innerHTML = `
            <strong>${titulo}</strong><br>
            <small>Coordenadas: ${latitude}, ${longitude}</small>
        `;
    }
    
    // Função para inicializar o mapa
    function inicializarMapa() {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.error('Coordenadas inválidas:', latitude, longitude);
            return;
        }
        
        const mapContainer = document.getElementById('modal-map');
        if (!mapContainer) {
            console.error('Container modal-map não encontrado');
            return;
        }
        
        // Verificar se já existe um mapa no container e removê-lo
        if (window.currentModalMap) {
            console.log('🗑️ Removendo mapa anterior do modal...');
            try {
                window.currentModalMap.remove();
            } catch (error) {
                console.warn('Erro ao remover mapa anterior:', error);
            }
            window.currentModalMap = null;
        }
        
        // Limpar o container
        mapContainer.innerHTML = '';
        
        try {
            const map = L.map('modal-map').setView([lat, lng], 16);
            // Armazenar referência do mapa
            window.currentModalMap = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Marcador personalizado
            const marker = L.circleMarker([lat, lng], {
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.8,
                radius: 20,
                weight: 4
            }).addTo(map);
            
            marker.bindPopup(`
                <div style="text-align: center;">
                    <h5 style="margin: 0 0 10px 0;">${titulo}</h5>
                    <div style="font-size: 14px; color: #666;">
                        <strong>Coordenadas:</strong><br>
                        ${latitude}, ${longitude}
                    </div>
                </div>
            `).openPopup();
        } catch (error) {
            console.error('Erro ao criar mapa:', error);
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center" style="height: 500px;">
                        <div class="text-center text-muted">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
                            <p>Erro ao carregar mapa</p>
                            <small>${error.message || 'Erro desconhecido'}</small>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Verificar se Leaflet está disponível
    if (typeof L === 'undefined') {
        console.log('🔄 Leaflet não disponível, tentando carregar...');
        const loadLeafletFn = window.loadLeaflet;
        if (typeof loadLeafletFn === 'function') {
            loadLeafletFn()
                .then(() => {
                    console.log('✅ Leaflet carregado, inicializando mapa...');
                    setTimeout(() => {
                        inicializarMapa();
                    }, 200);
                })
                .catch(error => {
                    console.error('❌ Erro ao carregar Leaflet:', error);
                    const mapContainer = document.getElementById('modal-map');
                    if (mapContainer) {
                        mapContainer.innerHTML = `
                            <div class="d-flex align-items-center justify-content-center" style="height: 500px;">
                                <div class="text-center text-muted">
                                    <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
                                    <p>Não foi possível carregar a biblioteca do mapa</p>
                                </div>
                            </div>
                        `;
                    }
                });
        } else {
            console.error('❌ Função loadLeaflet não disponível');
            const mapContainer = document.getElementById('modal-map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center" style="height: 500px;">
                        <div class="text-center text-muted">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
                            <p>Biblioteca do mapa não disponível</p>
                        </div>
                    </div>
                `;
            }
        }
    } else {
        // Leaflet já está disponível, inicializar diretamente
        setTimeout(() => {
            inicializarMapa();
        }, 100);
    }
    
    // Mostrar modal
    const modalElement = document.getElementById('modalMapa');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Limpar mapa quando o modal for fechado
        modalElement.addEventListener('hidden.bs.modal', function() {
            if (window.currentModalMap) {
                console.log('🗑️ Limpando mapa do modal ao fechar...');
                try {
                    window.currentModalMap.remove();
                } catch (error) {
                    console.warn('Erro ao remover mapa do modal:', error);
                }
                window.currentModalMap = null;
            }
        });
    } else {
        console.error('Modal modalMapa não encontrado');
    }
}

/**
 * Inicializa monitoramento de jobs em processamento
 */
function iniciarMonitoramentoJobs() {
    // Verificar se asyncProcessor está disponível
    if (typeof asyncProcessor === 'undefined') {
        console.warn('AsyncProcessor não disponível');
        return;
    }

    // Buscar jobs em processamento
    fetch('/api/jobs/')
        .then(response => response.json())
        .then(data => {
            if (data.jobs && data.jobs.length > 0) {
                console.log(`Iniciando monitoramento de ${data.jobs.length} job(s) em processamento`);
                
                // Adicionar cada job ao monitor
                data.jobs.forEach(job => {
                    if (job.job_id && job.status_analise !== 'analisada' && job.status_analise !== 'erro') {
                        asyncProcessor.addJob(job.job_id, {
                            onProgress: (statusData) => {
                                console.log(`Job ${job.job_id}: ${statusData.progresso}%`);
                                // Recarregar tabela para mostrar progresso atualizado
                                carregarDadosHistorico(currentPage);
                            },
                            onSuccess: () => {
                                console.log(`Job ${job.job_id} concluído!`);
                                // Recarregar tabela
                                carregarDadosHistorico(currentPage);
                            },
                            onError: (error) => {
                                console.error(`Job ${job.job_id} falhou:`, error);
                                // Recarregar tabela
                                carregarDadosHistorico(currentPage);
                            }
                        });
                    }
                });
            }
        })
        .catch(error => {
            console.error('Erro ao buscar jobs em processamento:', error);
        });
}

// Iniciar monitoramento quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar 1 segundo para garantir que asyncProcessor está disponível
    setTimeout(iniciarMonitoramentoJobs, 1000);
});
