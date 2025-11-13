/**
 * Scripts do Dashboard ARITANA
 * Funções para carregar mapa e gráficos
 */

// Indicador de carregamento
function showLoadingIndicator() {
    const mapContainer = document.getElementById('map');
    const chartsContainer = document.querySelector('#legalityChart, #regionChart');
    
    if (mapContainer && !mapContainer.querySelector('.loading-placeholder')) {
        mapContainer.innerHTML = `
            <div class="loading-placeholder d-flex align-items-center justify-content-center" style="height: 400px;">
                <div class="text-center">
                    <div class="spinner-border text-success mb-3" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="text-muted">Carregando mapa...</p>
                </div>
            </div>
        `;
    }
    
    if (chartsContainer && !chartsContainer.querySelector('.loading-placeholder')) {
        chartsContainer.innerHTML = `
            <div class="loading-placeholder d-flex align-items-center justify-content-center" style="height: 250px;">
                <div class="text-center">
                    <div class="spinner-border text-success mb-3" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="text-muted">Carregando gráficos...</p>
                </div>
            </div>
        `;
    }
}

function hideLoadingIndicator() {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(element => {
        element.remove();
    });
}

// Limpar completamente o mapa
function clearMap() {
    if (window.currentMap) {
        console.log('Removendo mapa anterior...');
        try {
            window.currentMap.remove();
        } catch (error) {
            console.warn('Erro ao remover mapa:', error);
        }
        window.currentMap = null;
    }
    
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = '';
    }
}

// Inicializar Mapa
function initializeMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('Container do mapa não encontrado');
        return;
    }
    
    // Verificar se o container está visível
    if (mapContainer.offsetParent === null) {
        console.log('Container do mapa não está visível, aguardando...');
        setTimeout(() => initializeMap(), 500);
        return;
    }
    
    console.log('Inicializando mapa...');
    
    // Limpar completamente o mapa anterior
    clearMap();
    
    // Verificar se Leaflet está disponível
    if (typeof L === 'undefined') {
        console.error('Leaflet não está disponível!');
        mapContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center" style="height: 400px;">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h5 class="text-muted">Erro ao carregar biblioteca do mapa</h5>
                    <p class="text-muted small">Leaflet não foi carregado corretamente</p>
                    <button class="btn btn-sm btn-outline-success" onclick="location.reload()">
                        <i class="fas fa-redo me-1"></i> Recarregar Página
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Criar mapa com coordenadas padrão (será ajustado quando os dados chegarem)
    const map = L.map('map').setView([-1.4558, -48.5044], 10); // Belém, PA
    window.currentMap = map;
    
    // Usar tiles mais leves para melhor performance
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        maxNativeZoom: 17
    }).addTo(map);
    
    // Carregar dados das embarcações com timeout
    // Usar URL absoluta para funcionar em produção
    const apiUrl = window.location.origin + '/api/mapa/';
    const fetchPromise = fetch(apiUrl);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
    );
    
    Promise.race([fetchPromise, timeoutPromise])
        .then(response => response.json())
        .then(data => {
            console.log('Dados do mapa carregados:', data);
            
            if (data.embarcacoes && data.embarcacoes.length > 0) {
                // Filtrar apenas embarcações com coordenadas válidas
                const embarcacoesComCoords = data.embarcacoes.filter(e => 
                    e.latitude && e.longitude && 
                    !isNaN(parseFloat(e.latitude)) && 
                    !isNaN(parseFloat(e.longitude))
                );
                
                console.log(`Mostrando ${embarcacoesComCoords.length} embarcações no mapa`);
                
                // Adicionar marcadores ao mapa
                embarcacoesComCoords.forEach(embarcacao => {
                    if (embarcacao.latitude && embarcacao.longitude) {
                        const lat = parseFloat(embarcacao.latitude);
                        const lng = parseFloat(embarcacao.longitude);
                        
                        if (!isNaN(lat) && !isNaN(lng)) {
                            const isLegal = embarcacao.classificacao && 
                                          embarcacao.classificacao.toLowerCase() === 'legal';
                            
                            const markerColor = isLegal ? '#28a745' : '#dc3545';
                            const iconHtml = `<div style="
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                background-color: ${markerColor};
                                border: 2px solid white;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            "></div>`;
                            
                            const customIcon = L.divIcon({
                                html: iconHtml,
                                className: 'custom-div-icon',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            });
                            
                            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
                            
                            // Popup simplificado
                            marker.bindPopup(`
                                <div class="popup-content">
                                    <strong>${embarcacao.localidade || 'Localidade não informada'}</strong><br>
                                    <span class="badge ${isLegal ? 'bg-success' : 'bg-danger'}">
                                        ${isLegal ? 'Legal' : 'Ilegal'}
                                    </span>
                                </div>
                            `, {
                                maxWidth: 200,
                                className: 'custom-popup'
                            });
                        }
                    }
                });
                
                console.log(`Mapa carregado com ${embarcacoesComCoords.length} marcadores`);
            } else {
                console.log('Nenhuma embarcação encontrada para o mapa');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar dados do mapa:', error);
            mapContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center" style="height: 400px;">
                    <div class="text-center">
                        <i class="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Mapa Indisponível</h5>
                        <p class="text-muted small">Não foi possível carregar os dados do mapa</p>
                        <button class="btn btn-sm btn-outline-success" onclick="retryMapLoad()">
                            <i class="fas fa-redo me-1"></i> Tentar Novamente
                        </button>
                    </div>
                </div>
            `;
            
            // Mostrar notificação de erro
            showErrorMessage('Falha ao carregar o mapa. Verifique sua conexão.');
        });
    
    // Adicionar legenda
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <div style="margin-bottom: 5px;"><strong>Legenda:</strong></div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 12px; height: 12px; background-color: #28a745; border-radius: 50%; margin-right: 5px;"></div>
                    <span style="font-size: 12px;">Legal</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="width: 12px; height: 12px; background-color: #dc3545; border-radius: 50%; margin-right: 5px;"></div>
                    <span style="font-size: 12px;">Ilegal</span>
                </div>
            </div>
        `;
        return div;
    };
    legend.addTo(map);
}

// Limpar todos os gráficos
function clearAllCharts() {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.log('Chart.js não disponível, pulando limpeza de gráficos');
        return;
    }
    
    const charts = ['legalityChart', 'regionChart'];
    
    charts.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            try {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    console.log(`Destruindo gráfico ${chartId}...`);
                    existingChart.destroy();
                }
            } catch (error) {
                console.warn(`Erro ao destruir gráfico ${chartId}:`, error);
            }
        }
    });
}

// Inicializar Gráficos
function initializeCharts() {
    console.log('Inicializando gráficos...');
    
    const legalityChart = document.getElementById('legalityChart');
    const regionChart = document.getElementById('regionChart');
    
    if (!legalityChart && !regionChart) {
        console.warn('Containers dos gráficos não encontrados');
        return;
    }
    
    // Verificar se os containers estão visíveis
    if ((legalityChart && legalityChart.offsetParent === null) || 
        (regionChart && regionChart.offsetParent === null)) {
        console.log('Containers dos gráficos não estão visíveis, aguardando...');
        setTimeout(() => initializeCharts(), 500);
        return;
    }
    
    // Limpar todos os gráficos anteriores
    clearAllCharts();
    
    // Timeout para carregamento dos gráficos
    const fetchPromise = fetch('/api/graficos/');
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    Promise.race([fetchPromise, timeoutPromise])
        .then(response => response.json())
        .then(data => {
            console.log('Dados dos gráficos carregados:', data);
            
            // Criar gráficos com animação suave
            createLegalityChart(data.legalidade);
            
            if (data.regional && data.regional.meses && data.regional.meses.length > 0) {
                createRegionalChart(data.regional);
            }
        })
        .catch(error => {
            console.error('Erro ao carregar dados dos gráficos:', error);
            // Mostrar mensagem de erro
            const chartContainers = document.querySelectorAll('#legalityChart, #regionChart');
            chartContainers.forEach(container => {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                        <h6 class="text-muted">Gráfico Indisponível</h6>
                        <p class="text-muted small">Não foi possível carregar os dados</p>
                        <button class="btn btn-sm btn-outline-success" onclick="retryChartsLoad()">
                            <i class="fas fa-redo me-1"></i> Tentar Novamente
                        </button>
                    </div>
                `;
            });
            
            // Mostrar notificação de erro
            showErrorMessage('Falha ao carregar gráficos. Verifique sua conexão.');
        });
}

// Criar gráfico de legalidade
function createLegalityChart(legalidadeData) {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não disponível para criar gráfico de legalidade');
        return;
    }
    
    const ctx = document.getElementById('legalityChart');
    if (!ctx || !legalidadeData) {
        console.warn('Elemento legalityChart não encontrado ou dados ausentes');
        return;
    }
    
    // Limpar canvas anterior se existir
    try {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }
    } catch (error) {
        console.warn('Erro ao limpar gráfico anterior:', error);
    }
    
    const isLegal = legalidadeData.legais || 0;
    const isIllegal = legalidadeData.ilegais || 0;
    
    console.log('Criando gráfico de legalidade com dados:', { isLegal, isIllegal });
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Legais', 'Ilegais'],
            datasets: [{
                data: [isLegal, isIllegal],
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1500
            }
        }
    });
    
    // Atualizar números abaixo do gráfico
    setTimeout(() => {
        updateChartNumbers(isLegal, isIllegal);
    }, 100);
    
    console.log('Gráfico de legalidade criado com sucesso');
}

// Função para reinicializar tudo de forma segura
function safeReinitializeDashboard() {
    console.log('Reinicializando dashboard de forma segura...');
    
    // Limpar tudo primeiro
    clearMap();
    clearAllCharts();
    
    // Reinicializar imediatamente (sem setTimeout desnecessário)
    // Reinicializar mapa
    if (typeof L !== 'undefined') {
        // Leaflet já carregado
        initializeMap();
    } else if (typeof window.loadLeaflet === 'function') {
        window.loadLeaflet().then(() => {
            initializeMap();
        }).catch(error => {
            console.error('Erro ao carregar Leaflet:', error);
        });
    } else {
        console.warn('Leaflet não disponível para reinicialização');
    }
    
    // Reinicializar gráficos
    if (typeof Chart !== 'undefined') {
        // Chart.js já carregado
        initializeCharts();
        initializeTemporalChart();
    } else if (typeof window.loadChartJS === 'function') {
        window.loadChartJS().then(() => {
            initializeCharts();
            initializeTemporalChart();
        }).catch(error => {
            console.error('Erro ao carregar Chart.js:', error);
        });
    } else {
        console.warn('Chart.js não disponível para reinicialização');
    }
    
    console.log('Dashboard reinicializado');
}

// Debounce para evitar múltiplas inicializações
let reinitializeTimeout = null;

function debouncedReinitialize() {
    if (reinitializeTimeout) {
        clearTimeout(reinitializeTimeout);
    }
    
    reinitializeTimeout = setTimeout(() => {
        safeReinitializeDashboard();
        reinitializeTimeout = null;
    }, 500);
}

// Criar gráfico temporal
function createTemporalChart() {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não disponível para criar gráfico temporal');
        return;
    }
    
    const ctx = document.getElementById('temporalChart');
    if (!ctx) {
        console.warn('Elemento temporalChart não encontrado');
        return;
    }
    
    // Limpar canvas anterior se existir
    try {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }
    } catch (error) {
        console.warn('Erro ao limpar gráfico temporal anterior:', error);
    }
    
    // Buscar dados reais das embarcações da API
    const embarcacoes = window.navigationCache?.cache?.embarcacoes || [];
    
    if (!embarcacoes || embarcacoes.length === 0) {
        console.warn('Nenhuma embarcação encontrada para o gráfico temporal');
        return;
    }
    
    // Processar dados reais por data
    const dataMap = new Map();
    
    console.log('Processando dados para gráfico temporal:', embarcacoes.length, 'embarcações');
    
    embarcacoes.forEach(embarcacao => {
        // Verificar diferentes campos de data possíveis
        const dataRegistro = embarcacao.data_registro || embarcacao.data_cadastro || embarcacao.data_foto;
        
        if (dataRegistro) {
            try {
                const date = new Date(dataRegistro);
                
                // Verificar se a data é válida
                if (!isNaN(date.getTime())) {
                    const dateKey = date.toLocaleDateString('pt-BR');
                    
                    if (!dataMap.has(dateKey)) {
                        dataMap.set(dateKey, { legal: 0, illegal: 0 });
                    }
                    
                    const data = dataMap.get(dateKey);
                    const classificacao = embarcacao.classificacao?.toLowerCase();
                    
                    if (classificacao === 'legal') {
                        data.legal++;
                    } else if (classificacao === 'ilegal') {
                        data.illegal++;
                    }
                } else {
                    console.warn('Data inválida para embarcação:', embarcacao.id, dataRegistro);
                }
            } catch (error) {
                console.warn('Erro ao processar data da embarcação:', embarcacao.id, dataRegistro, error);
            }
        } else {
            console.warn('Nenhuma data encontrada para embarcação:', embarcacao.id);
        }
    });
    
    console.log('Dados processados por data:', Array.from(dataMap.entries()));
    
    // Ordenar datas e preparar dados para o gráfico
    const sortedDates = Array.from(dataMap.keys()).sort((a, b) => {
        return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
    });
    
    console.log('Datas ordenadas:', sortedDates);
    
    // Se não há dados suficientes, usar todas as datas disponíveis
    let datesToUse = sortedDates;
    if (sortedDates.length > 7) {
        datesToUse = sortedDates.slice(-7); // Últimos 7 dias
    } else if (sortedDates.length > 0) {
        datesToUse = sortedDates; // Usar todas as datas disponíveis
    } else {
        console.warn('Nenhuma data válida encontrada para o gráfico temporal');
        return;
    }
    
    const dates = datesToUse;
    const legalData = datesToUse.map(date => dataMap.get(date)?.legal || 0);
    const illegalData = datesToUse.map(date => dataMap.get(date)?.illegal || 0);
    const totalData = datesToUse.map(date => {
        const data = dataMap.get(date);
        return (data?.legal || 0) + (data?.illegal || 0);
    });
    
    console.log('Dados finais para o gráfico:', {
        dates: dates,
        legalData: legalData,
        illegalData: illegalData,
        totalData: totalData
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates, // Usar dados reais processados
            datasets: [
                {
                    label: 'Total',
                    data: totalData,
                    backgroundColor: 'rgba(45, 90, 74, 0.8)', // Verde escuro da logo (--primary-color)
                    borderColor: 'rgba(45, 90, 74, 1)',
                    borderWidth: 1,
                    stack: 'total'
                },
                {
                    label: 'Legais',
                    data: legalData,
                    backgroundColor: 'rgba(74, 139, 122, 0.8)', // Verde água da logo (--accent-color)
                    borderColor: 'rgba(74, 139, 122, 1)',
                    borderWidth: 1,
                    stack: 'legal'
                },
                {
                    label: 'Ilegais',
                    data: illegalData,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)', // Vermelho alerta (--danger-color)
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 1,
                    stack: 'illegal'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                       title: {
                           display: true,
                           text: `Histórico de Embarcações por Período (${dates.length} dias)`,
                           font: {
                               size: 14,
                               weight: 'bold'
                           }
                       }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
           // Atualizar estatísticas resumidas com dados reais
           const totalSum = totalData.reduce((a, b) => a + b, 0);
           const legalSum = legalData.reduce((a, b) => a + b, 0);
           const illegalSum = illegalData.reduce((a, b) => a + b, 0);
           
           console.log('Estatísticas resumidas do gráfico temporal:', {
               total: totalSum,
               legal: legalSum,
               illegal: illegalSum
           });
           
           // Atualizar elementos de estatísticas se existirem
           setTimeout(() => {
               // Buscar elementos na nova estrutura HTML
               const cardContainer = ctx.closest('.card-body');
               if (cardContainer) {
                   const totalElement = cardContainer.querySelector('.text-primary');
                   const legalElement = cardContainer.querySelector('.text-success');
                   const illegalElement = cardContainer.querySelector('.text-danger');
                   
                   if (totalElement) {
                       totalElement.textContent = totalSum;
                       console.log('Atualizado total:', totalSum);
                   }
                   if (legalElement) {
                       legalElement.textContent = legalSum;
                       console.log('Atualizado legal:', legalSum);
                   }
                   if (illegalElement) {
                       illegalElement.textContent = illegalSum;
                       console.log('Atualizado illegal:', illegalSum);
                   }
               } else {
                   console.warn('Container do gráfico temporal não encontrado para atualizar estatísticas');
               }
           }, 100);
    
    console.log('Gráfico temporal criado com sucesso');
}

// Inicializar gráfico temporal
function initializeTemporalChart() {
    const temporalChart = document.getElementById('temporalChart');
    if (!temporalChart) {
        console.warn('Container do gráfico temporal não encontrado');
        return;
    }
    
    // Verificar se o container está visível
    if (temporalChart.offsetParent === null) {
        console.log('Container do gráfico temporal não está visível, aguardando...');
        setTimeout(() => initializeTemporalChart(), 500);
        return;
    }
    
    createTemporalChart();
}

// Funções para modais e ações das embarcações
function verDetalhes(embarcacaoId) {
    console.log('Ver detalhes da embarcação:', embarcacaoId);
    console.log('Tipo do ID:', typeof embarcacaoId);
    
    // Buscar dados da embarcação
    const embarcacao = window.navigationCache?.cache?.embarcacoes?.find(e => e.id == embarcacaoId);
    
    if (!embarcacao) {
        console.warn('Embarcação não encontrada:', embarcacaoId);
        console.log('IDs disponíveis:', window.navigationCache?.cache?.embarcacoes?.map(e => e.id));
        return;
    }
    
    // Preencher modal de detalhes
    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
        // Verificar diferentes campos possíveis
        const nome = embarcacao.localidade || embarcacao.nome || 'N/A';
        const imagemUrl = embarcacao.imagem_url || embarcacao.imagem || embarcacao.foto_url || embarcacao.url_imagem;
        const latitude = embarcacao.latitude || embarcacao.lat || embarcacao.coordenadas?.lat || 'N/A';
        const longitude = embarcacao.longitude || embarcacao.lng || embarcacao.lon || embarcacao.coordenadas?.lng || 'N/A';
        const dataCadastro = embarcacao.data_cadastro || embarcacao.data_registro || 'N/A';
        const dataFoto = embarcacao.data_foto || 'N/A';
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-ship me-2"></i>Informações da Embarcação</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>${embarcacao.id || 'N/A'}</td></tr>
                        <tr><td><strong>Nome:</strong></td><td>${nome}</td></tr>
                        <tr><td><strong>Região:</strong></td><td>${embarcacao.regiao || 'N/A'}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>
                            <span class="badge ${embarcacao.classificacao === 'legal' ? 'bg-success' : 'bg-danger'}">
                                ${embarcacao.classificacao === 'legal' ? 'Legal' : 'Ilegal'}
                            </span>
                        </td></tr>
                        <tr><td><strong>Cadastro:</strong></td><td>${dataCadastro}</td></tr>
                        ${dataFoto !== 'N/A' ? `<tr><td><strong>Foto:</strong></td><td>${dataFoto}</td></tr>` : ''}
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-map-marker-alt me-2"></i>Localização</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Latitude:</strong></td><td>${latitude}</td></tr>
                        <tr><td><strong>Longitude:</strong></td><td>${longitude}</td></tr>
                    </table>
                    
                    ${imagemUrl ? `
                        <h6><i class="fas fa-camera me-2"></i>Imagem</h6>
                        <img src="${imagemUrl}" alt="Imagem da embarcação" class="img-fluid rounded" style="max-height: 200px;">
                    ` : '<p class="text-muted"><i class="fas fa-ban"></i> Nenhuma imagem disponível</p>'}
                </div>
            </div>
        `;
    }
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
    modal.show();
}

function verImagem(embarcacaoId) {
    console.log('Ver imagem da embarcação:', embarcacaoId);
    console.log('Tipo do ID:', typeof embarcacaoId);
    
    // Buscar dados da embarcação
    const embarcacao = window.navigationCache?.cache?.embarcacoes?.find(e => e.id == embarcacaoId);
    
    if (!embarcacao) {
        console.warn('Embarcação não encontrada:', embarcacaoId);
        console.log('IDs disponíveis:', window.navigationCache?.cache?.embarcacoes?.map(e => e.id));
        alert('Embarcação não encontrada.');
        return;
    }
    
    // Verificar diferentes campos possíveis para imagem
    const imagemUrl = embarcacao.imagem_url || embarcacao.imagem || embarcacao.foto_url || embarcacao.url_imagem;
    
    if (!imagemUrl) {
        console.warn('Imagem não encontrada para embarcação:', embarcacaoId);
        alert('Imagem não disponível para esta embarcação.');
        return;
    }
    
    // Preencher modal de imagem
    const imagemElement = document.getElementById('imagem-embarcacao');
    const tituloElement = document.getElementById('imagem-titulo');
    const linkElement = document.getElementById('link-imagem-original');
    
    if (imagemElement) {
        imagemElement.src = imagemUrl;
        imagemElement.alt = `Imagem da embarcação ${embarcacao.id}`;
    }
    
    if (tituloElement) {
        tituloElement.textContent = `Embarcação ${embarcacao.id} - ${embarcacao.localidade || embarcacao.nome || 'Nome não especificado'}`;
    }
    
    if (linkElement) {
        linkElement.href = imagemUrl;
    }
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalImagem'));
    modal.show();
}

function verNoMapa(embarcacaoId) {
    console.log('Ver embarcação no mapa:', embarcacaoId);
    console.log('Tipo do ID:', typeof embarcacaoId);
    
    // Buscar dados da embarcação
    const embarcacao = window.navigationCache?.cache?.embarcacoes?.find(e => e.id == embarcacaoId);
    
    if (!embarcacao) {
        console.warn('Embarcação não encontrada:', embarcacaoId);
        console.log('IDs disponíveis:', window.navigationCache?.cache?.embarcacoes?.map(e => e.id));
        alert('Embarcação não encontrada.');
        return;
    }
    
    // Verificar diferentes campos possíveis para coordenadas
    const latitude = embarcacao.latitude || embarcacao.lat || embarcacao.coordenadas?.lat;
    const longitude = embarcacao.longitude || embarcacao.lng || embarcacao.lon || embarcacao.coordenadas?.lng;
    
    if (!latitude || !longitude) {
        console.warn('Coordenadas não encontradas para embarcação:', embarcacaoId);
        console.log('Dados da embarcação:', embarcacao);
        alert('Coordenadas não disponíveis para esta embarcação.');
        return;
    }
    
    // Converter para números se necessário
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        console.warn('Coordenadas inválidas para embarcação:', embarcacaoId, latitude, longitude);
        alert('Coordenadas inválidas para esta embarcação.');
        return;
    }
    
    // Preencher modal de mapa
    const coordenadasInfo = document.getElementById('coordenadas-info');
    if (coordenadasInfo) {
        coordenadasInfo.textContent = `Latitude: ${lat}, Longitude: ${lng}`;
    }
    
    // Criar mapa no modal
    setTimeout(() => {
        const mapContainer = document.getElementById('modal-map');
        if (mapContainer && typeof L !== 'undefined') {
            // Limpar mapa anterior se existir
            mapContainer.innerHTML = '';
            
            // Criar novo mapa
            const map = L.map('modal-map').setView([lat, lng], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Adicionar marcador
            const marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup(`
                <strong>Embarcação ${embarcacao.id}</strong><br>
                Nome: ${embarcacao.localidade || embarcacao.nome || 'N/A'}<br>
                Status: ${embarcacao.classificacao === 'legal' ? 'Legal' : 'Ilegal'}<br>
                Região: ${embarcacao.regiao || 'N/A'}
            `).openPopup();
        } else {
            console.warn('Leaflet não disponível ou container de mapa não encontrado');
        }
    }, 100);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalMapa'));
    modal.show();
}

// Função de debug para verificar dados das embarcações
function debugEmbarcacao(embarcacaoId) {
    const embarcacao = window.navigationCache?.cache?.embarcacoes?.find(e => e.id == embarcacaoId);
    if (embarcacao) {
        console.log('Dados da embarcação:', embarcacao);
        console.log('Campos disponíveis:', Object.keys(embarcacao));
        return embarcacao;
    } else {
        console.log('Embarcação não encontrada:', embarcacaoId);
        console.log('IDs disponíveis:', window.navigationCache?.cache?.embarcacoes?.map(e => e.id));
        return null;
    }
}

// Expor funções globalmente
window.safeReinitializeDashboard = safeReinitializeDashboard;
window.debouncedReinitialize = debouncedReinitialize;
window.clearMap = clearMap;
window.clearAllCharts = clearAllCharts;
window.initializeTemporalChart = initializeTemporalChart;
window.verDetalhes = verDetalhes;
window.verImagem = verImagem;
window.verNoMapa = verNoMapa;
window.debugEmbarcacao = debugEmbarcacao;

// Atualizar números abaixo do gráfico
function updateChartNumbers(legal, illegal) {
    // Procurar elementos com os números
    const legalNumbers = document.querySelectorAll('.stat-legal');
    const illegalNumbers = document.querySelectorAll('.stat-illegal');
    
    legalNumbers.forEach(element => {
        if (element.style.fontSize === '2rem' || element.closest('.text-center')) {
            animateNumber(element, legal);
        }
    });
    
    illegalNumbers.forEach(element => {
        if (element.style.fontSize === '2rem' || element.closest('.text-center')) {
            animateNumber(element, illegal);
        }
    });
}

// Animar número individual
function animateNumber(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Criar gráfico regional
function createRegionalChart(regionalData) {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não disponível para criar gráfico regional');
        return;
    }
    
    const ctx = document.getElementById('regionChart');
    if (!ctx || !regionalData) {
        console.warn('Elemento regionChart não encontrado ou dados ausentes');
        return;
    }
    
    // Limpar gráfico anterior se existir
    try {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('Destruindo gráfico regional anterior...');
            existingChart.destroy();
        }
    } catch (error) {
        console.warn('Erro ao limpar gráfico regional anterior:', error);
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: regionalData.meses || [],
            datasets: [
                {
                    label: 'Legais',
                    data: regionalData.legais || [],
                    backgroundColor: '#28a745',
                    borderRadius: 4
                },
                {
                    label: 'Ilegais',
                    data: regionalData.ilegais || [],
                    backgroundColor: '#dc3545',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            animation: {
                duration: 2000
            }
        }
    });
    
    console.log('Gráfico regional criado');
}

// Redirecionar para página de upload
function redirecionarParaUpload() {
    console.log('Redirecionando para página de upload...');
    window.location.href = '/upload-page/';
}

// Inicializar upload
function initializeUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadDetails = document.getElementById('uploadDetails');
    
    // A área de upload agora usa onclick inline no template
    // para garantir que funcione imediatamente sem depender de JavaScript carregado
    console.log('Upload inicializado - usando onclick inline do template');
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
    }
}

function handleFileSelect(file) {
    const uploadDetails = document.getElementById('uploadDetails');
    if (uploadDetails) {
        uploadDetails.style.display = 'block';
    }
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
    }
    
    // Validar tamanho (20MB)
    if (file.size > 20 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 20MB.');
        return;
    }
    
    console.log('Arquivo selecionado:', file.name);
}

// Inicializar tabs
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.btn-tab-custom');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Adicionar active ao clicado
            button.classList.add('active');
        });
    });
}

// Atualizar estatísticas com dados do Django
function updateDashboardStatsFromDjango() {
    const totalElement = document.querySelector('.stat-total');
    const legalElement = document.querySelector('.stat-legal');
    const illegalElement = document.querySelector('.stat-illegal');

    if (totalElement) {
        // Verificar se os elementos já têm valores corretos do Django
        const currentTotal = parseInt(totalElement.textContent);
        const currentLegal = parseInt(legalElement ? legalElement.textContent : 0);
        const currentIllegal = parseInt(illegalElement ? illegalElement.textContent : 0);

        console.log('Estatísticas atuais:', { currentTotal, currentLegal, currentIllegal });

        // Se ainda estão zerados, tentar carregar via API
        if (currentTotal === 0 && currentLegal === 0 && currentIllegal === 0) {
            console.log('Carregando estatísticas via API...');
            loadStatsFromAPI();
        }
    }
}

// Carregar estatísticas via API
function loadStatsFromAPI() {
    fetch('/api/cache/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dados da API:', data);
            
            if (data.estatisticas && data.estatisticas.legalidade) {
                const total = data.estatisticas.legalidade.legais + data.estatisticas.legalidade.ilegais;
                const legal = data.estatisticas.legalidade.legais;
                const illegal = data.estatisticas.legalidade.ilegais;

                console.log('Atualizando com dados da API:', { total, legal, illegal });

                // Animar a atualização dos números
                animateStatUpdate('.stat-total', total);
                animateStatUpdate('.stat-legal', legal);
                animateStatUpdate('.stat-illegal', illegal);
            } else {
                console.warn('Dados de estatísticas não encontrados na resposta da API');
                showErrorMessage('Dados de estatísticas indisponíveis');
            }
        })
        .catch(error => {
            console.error('Erro ao carregar estatísticas:', error);
            showErrorMessage('Erro ao carregar estatísticas: ' + error.message);
            
            // Fallback para valores padrão se a API falhar
            setDefaultStats();
        });
}

// Animar atualização de estatísticas
function animateStatUpdate(selector, targetValue) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentAnimatedValue = Math.round(currentValue + (targetValue - currentValue) * progress);
        
        element.textContent = currentAnimatedValue;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Definir estatísticas padrão em caso de erro
function setDefaultStats() {
    const totalElement = document.querySelector('.stat-total');
    const legalElement = document.querySelector('.stat-legal');
    const illegalElement = document.querySelector('.stat-illegal');

    if (totalElement && totalElement.textContent === '0') totalElement.textContent = '--';
    if (legalElement && legalElement.textContent === '0') legalElement.textContent = '--';
    if (illegalElement && illegalElement.textContent === '0') illegalElement.textContent = '--';
}

// Mostrar mensagem de erro
function showErrorMessage(message) {
    // Verificar se já existe uma mensagem de erro
    if (document.querySelector('.error-toast')) return;
    
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast alert alert-warning alert-dismissible fade show position-fixed';
    errorToast.style.top = '20px';
    errorToast.style.right = '20px';
    errorToast.style.zIndex = '10000';
    errorToast.style.maxWidth = '350px';
    errorToast.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(errorToast);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (errorToast.parentNode) {
            errorToast.remove();
        }
    }, 5000);
}

// Função para retry do mapa
function retryMapLoad() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center" style="height: 400px;">
                <div class="text-center">
                    <div class="spinner-border text-success mb-3" role="status">
                        <span class="visually-hidden">Recarregando...</span>
                    </div>
                    <p class="text-muted">Recarregando mapa...</p>
                </div>
            </div>
        `;
    }
    
    // Aguardar um pouco antes de tentar novamente
    setTimeout(() => {
        initializeMap();
    }, 1000);
}

// Função para retry dos gráficos
function retryChartsLoad() {
    const chartContainers = document.querySelectorAll('#legalityChart, #regionChart');
    chartContainers.forEach(container => {
        container.innerHTML = `
            <div class="d-flex align-items-center justify-content-center" style="height: 250px;">
                <div class="text-center">
                    <div class="spinner-border text-success mb-3" role="status">
                        <span class="visually-hidden">Recarregando...</span>
                    </div>
                    <p class="text-muted">Recarregando gráfico...</p>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        initializeCharts();
    }, 1000);
}

// Expor funções globalmente
window.initializeMap = initializeMap;
window.initializeCharts = initializeCharts;
window.initializeUpload = initializeUpload;
window.initializeTabs = initializeTabs;
window.redirecionarParaUpload = redirecionarParaUpload;
// Função para filtrar embarcações no histórico
function filtrarEmbarcacoes() {
    const tipoFiltro = document.getElementById('filtro-tipo')?.value || '';
    const regiaoFiltro = document.getElementById('filtro-regiao')?.value || '';
    const buscaFiltro = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    
    console.log('Filtrando embarcações:', { tipoFiltro, regiaoFiltro, buscaFiltro });
    
    // Se não há dados no cache, recarregar
    if (!window.navigationCache?.cache?.embarcacoes) {
        console.log('Recarregando dados para filtro...');
        window.navigationCache?.loadData(true).then(() => {
            aplicarFiltros(tipoFiltro, regiaoFiltro, buscaFiltro);
        });
        return;
    }
    
    aplicarFiltros(tipoFiltro, regiaoFiltro, buscaFiltro);
}

function aplicarFiltros(tipoFiltro, regiaoFiltro, buscaFiltro) {
    const embarcacoes = window.navigationCache?.cache?.embarcacoes || [];
    
    let embarcacoesFiltradas = embarcacoes.filter(embarcacao => {
        // Filtro por tipo (legal/ilegal)
        if (tipoFiltro && embarcacao.classificacao?.toLowerCase() !== tipoFiltro) {
            return false;
        }
        
        // Filtro por região
        if (regiaoFiltro && embarcacao.regiao !== regiaoFiltro) {
            return false;
        }
        
        // Filtro por busca (nome ou ID)
        if (buscaFiltro) {
            const nome = embarcacao.localidade?.toLowerCase() || '';
            const id = embarcacao.id?.toString() || '';
            if (!nome.includes(buscaFiltro) && !id.includes(buscaFiltro)) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`Filtro aplicado: ${embarcacoesFiltradas.length} de ${embarcacoes.length} embarcações`);
    
    // Atualizar tabela com dados filtrados
    if (window.navigationCache) {
        window.navigationCache.updateHistoricoTable(embarcacoesFiltradas);
        window.navigationCache.updateHistoricoStats(embarcacoesFiltradas);
    }
}

window.showLoadingIndicator = showLoadingIndicator;
window.hideLoadingIndicator = hideLoadingIndicator;
window.updateDashboardStatsFromDjango = updateDashboardStatsFromDjango;
window.loadStatsFromAPI = loadStatsFromAPI;
window.retryMapLoad = retryMapLoad;
window.retryChartsLoad = retryChartsLoad;
window.showErrorMessage = showErrorMessage;
window.filtrarEmbarcacoes = filtrarEmbarcacoes;
