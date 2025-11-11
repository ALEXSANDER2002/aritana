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
        row.setAttribute('data-tipo', embarcacao.classificacao ? embarcacao.classificacao.toLowerCase() : '');
        row.setAttribute('data-regiao', embarcacao.regiao || '');
        row.setAttribute('data-nome', embarcacao.localidade ? embarcacao.localidade.toLowerCase() : '');
        row.setAttribute('data-id', embarcacao.id || '');
        row.setAttribute('data-latitude', embarcacao.latitude || '');
        row.setAttribute('data-longitude', embarcacao.longitude || '');
        row.setAttribute('data-imagem', embarcacao.imagem_url || '');
        row.setAttribute('data-data-cadastro', embarcacao.data_cadastro || '');
        row.setAttribute('data-data-foto', embarcacao.data_foto || '');
        
        row.innerHTML = `
            <td>
                <span class="fw-bold" style="color: #6b7280;">#${embarcacao.id || 'N/A'}</span>
            </td>
            <td>
                <strong style="color: #1f2937;">${embarcacao.localidade || 'N/A'}</strong>
            </td>
            <td>
                ${embarcacao.classificacao === 'processando' ? 
                    `<span class="badge bg-warning text-dark">
                        <i class="fas fa-spinner fa-spin"></i> Processando ${embarcacao.progresso ? `(${embarcacao.progresso}%)` : ''}
                    </span>` : 
                    `<span class="badge ${embarcacao.classificacao && embarcacao.classificacao.toLowerCase() === 'legal' ? 'bg-success' : 'bg-danger'}">
                        ${embarcacao.classificacao && embarcacao.classificacao.toLowerCase() === 'legal' ? 'Legal' : 'Ilegal'}
                    </span>`
                }
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
                    <button class="btn btn-sm" 
                            onclick="verDetalhes('${embarcacao.id || ''}')"
                            title="Ver detalhes"
                            style="background: #1f2937; border: 1px solid #1f2937; color: #ffffff;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm" 
                            onclick="verNoMapa('${embarcacao.latitude || ''}', '${embarcacao.longitude || ''}', '${embarcacao.localidade || 'N/A'}')"
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
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) return;
    
    const modalBody = document.getElementById('modal-body');
    const imagemUrl = row.dataset.imagem;
    const latitude = row.dataset.latitude;
    const longitude = row.dataset.longitude;
    const dataCadastro = row.dataset.dataCadastro;
    const dataFoto = row.dataset.dataFoto;
    
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
                        <p><strong><i class="fas fa-tag me-1"></i>Classificação:</strong> ${row.cells[2].innerHTML}</p>
                        <p><strong><i class="fas fa-globe me-1"></i>Região:</strong> ${row.cells[3].textContent}</p>
                        <p><strong><i class="fas fa-calendar me-1"></i>Data Cadastro:</strong> ${dataCadastro}</p>
                        ${dataFoto ? `<p><strong><i class="fas fa-camera me-1"></i>Data Foto:</strong> ${dataFoto}</p>` : ''}
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
                            <div class="text-center">
                                <button class="btn btn-primary" onclick="verImagem('${imagemUrl}', '${row.cells[1].textContent}')">
                                    <i class="fas fa-image me-1"></i>Ver Imagem
                                </button>
                            </div>
                        ` : '<p class="text-muted"><i class="fas fa-ban me-1"></i>Nenhuma imagem disponível</p>'}
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
    
    // Inicializar mini mapa
    setTimeout(() => {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        const map = L.map('mini-map').setView([lat, lng], 15);
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
        
        marker.bindPopup(`
            <div style="text-align: center;">
                <h6 style="margin: 0 0 10px 0;">${row.cells[1].textContent}</h6>
                ${row.cells[2].innerHTML}
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <strong>Coordenadas:</strong><br>
                    ${latitude}, ${longitude}
                </div>
            </div>
        `).openPopup();
    }, 100);
    
    // Mostrar modal
    new bootstrap.Modal(document.getElementById('modalDetalhes')).show();
}

function verImagem(url, titulo) {
    const imgElement = document.getElementById('imagem-embarcacao');
    const tituloElement = document.getElementById('imagem-titulo');
    const linkElement = document.getElementById('link-imagem-original');
    
    // Converter HTTP para HTTPS se necessário (Railway redireciona)
    if (url && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
        console.log('URL convertida para HTTPS:', url);
    }
    
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
    
    // Abrir modal
    new bootstrap.Modal(document.getElementById('modalImagem')).show();
}

// Exportar funções globalmente
window.formatarDataBrasil = formatarDataBrasil;
window.verImagem = verImagem;
window.verDetalhes = verDetalhes;
window.verNoMapa = verNoMapa;

function verNoMapa(latitude, longitude, titulo) {
    const modalBody = document.getElementById('coordenadas-info');
    modalBody.innerHTML = `
        <strong>${titulo}</strong><br>
        <small>Coordenadas: ${latitude}, ${longitude}</small>
    `;
    
    // Inicializar mapa no modal
    setTimeout(() => {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        const map = L.map('modal-map').setView([lat, lng], 16);
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
    }, 100);
    
    new bootstrap.Modal(document.getElementById('modalMapa')).show();
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
                                carregarDados();
                            },
                            onSuccess: () => {
                                console.log(`Job ${job.job_id} concluído!`);
                                // Recarregar tabela
                                carregarDados();
                            },
                            onError: (error) => {
                                console.error(`Job ${job.job_id} falhou:`, error);
                                // Recarregar tabela
                                carregarDados();
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
