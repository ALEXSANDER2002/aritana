/**
 * Map Loader - Carrega dados do mapa dos endpoints do backend
 */

// Adicionar ao namespace ARITANA
if (window.ARITANA) {
    window.ARITANA.Map = {
        mapInstance: null,
        markers: [],

        /**
         * Inicializa o módulo de mapa
         */
        init: function() {
            console.log('🗺️ Inicializando módulo de mapa');
            this.initializeMap();
            this.loadMarkers();
        },

        /**
         * Inicializa o mapa Leaflet
         */
        initializeMap: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.warn('⚠️ Elemento do mapa não encontrado');
                return;
            }

            // Configurar mapa centrado em Belém do Pará
            this.mapInstance = L.map('map').setView([-1.4558, -48.5034], 11);

            // Adicionar tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.mapInstance);

            // Configurar controles do mapa
            this.setupMapControls();

            console.log('✅ Mapa inicializado');
        },

        /**
         * Configura controles do mapa
         */
        setupMapControls: function() {
            if (!this.mapInstance) return;

            // Adicionar controle de escala
            L.control.scale().addTo(this.mapInstance);

            // Event listeners para filtros
            const filterButtons = document.querySelectorAll('[data-filter]');
            filterButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const filter = e.target.getAttribute('data-filter');
                    this.filterMarkers(filter);
                    
                    // Atualizar aparência dos botões
                    filterButtons.forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
                    e.target.classList.add('bg-blue-500', 'text-white');
                });
            });

            // Event listener para zoom
            const zoomButton = document.getElementById('resetZoom');
            if (zoomButton) {
                zoomButton.addEventListener('click', () => {
                    this.mapInstance.setView([-1.4558, -48.5034], 11);
                });
            }
        },

        /**
         * Carrega marcadores do backend
         */
        async loadMarkers() {
            try {
                console.log('📍 Carregando marcadores do mapa...');
                
                const response = await fetch('/api/mapa/');
                if (!response.ok) throw new Error('Erro ao carregar dados do mapa');
                
                const data = await response.json();
                console.log('📍 Dados do mapa carregados:', data);
                
                // Limpar marcadores existentes
                this.clearMarkers();
                
                // Adicionar novos marcadores
                if (data.analises && Array.isArray(data.analises)) {
                    data.analises.forEach(analise => {
                        this.addMarker(analise);
                    });
                }
                
                // Atualizar contador
                this.updateMarkerCount(data.total || 0);
                
            } catch (error) {
                console.error('❌ Erro ao carregar marcadores:', error);
                ARITANA.showError('Erro ao carregar dados do mapa');
            }
        },

        /**
         * Adiciona um marcador ao mapa
         */
        addMarker: function(analise) {
            if (!this.mapInstance) return;

            // Definir cor baseada no status
            const cor = this.getMarkerColor(analise.status);
            
            // Criar ícone customizado
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="w-3 h-3 ${cor} rounded-full border-2 border-white shadow-lg"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            // Criar marcador
            const marker = L.marker([analise.latitude, analise.longitude], { icon })
                .addTo(this.mapInstance);

            // Configurar popup
            const popupContent = this.createPopupContent(analise);
            marker.bindPopup(popupContent);

            // Adicionar ao array de marcadores
            this.markers.push({
                marker,
                analise,
                status: analise.status
            });
        },

        /**
         * Define a cor do marcador baseada no status
         */
        getMarkerColor: function(status) {
            switch (status) {
                case 'legal':
                    return 'bg-green-500';
                case 'ilegal':
                    return 'bg-red-500';
                case 'em_analise':
                    return 'bg-yellow-500';
                default:
                    return 'bg-gray-500';
            }
        },

        /**
         * Cria conteúdo do popup do marcador
         */
        createPopupContent: function(analise) {
            const statusText = {
                'legal': 'Legal',
                'ilegal': 'Ilegal',
                'em_analise': 'Em Análise'
            };

            const statusColor = {
                'legal': 'text-green-600',
                'ilegal': 'text-red-600',
                'em_analise': 'text-yellow-600'
            };

            return `
                <div class="p-2 min-w-48">
                    <h3 class="font-semibold text-gray-900 mb-2">Análise ${analise.id}</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Status:</span>
                            <span class="font-medium ${statusColor[analise.status] || 'text-gray-600'}">
                                ${statusText[analise.status] || 'Desconhecido'}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Confiança:</span>
                            <span class="font-medium">${analise.probabilidade}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Data:</span>
                            <span>${new Date(analise.data_analise).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Arquivo:</span>
                            <span class="text-xs">${analise.nome_arquivo}</span>
                        </div>
                    </div>
                    <button class="mt-2 w-full bg-blue-500 text-white text-xs py-1 px-2 rounded hover:bg-blue-600"
                            onclick="ARITANA.Map.showAnalysisDetails(${analise.id})">
                        Ver Detalhes
                    </button>
                </div>
            `;
        },

        /**
         * Filtra marcadores por status
         */
        filterMarkers: function(filter) {
            this.markers.forEach(({ marker, status }) => {
                if (filter === 'todos' || status === filter) {
                    marker.addTo(this.mapInstance);
                } else {
                    this.mapInstance.removeLayer(marker);
                }
            });

            // Atualizar contador
            const visibleCount = filter === 'todos' ? 
                this.markers.length : 
                this.markers.filter(m => m.status === filter).length;
            
            this.updateMarkerCount(visibleCount);
        },

        /**
         * Atualiza o contador de marcadores
         */
        updateMarkerCount: function(count) {
            const counter = document.getElementById('markerCount');
            if (counter) {
                counter.textContent = `${count} embarcações`;
            }
        },

        /**
         * Limpa todos os marcadores
         */
        clearMarkers: function() {
            this.markers.forEach(({ marker }) => {
                this.mapInstance.removeLayer(marker);
            });
            this.markers = [];
        },

        /**
         * Mostra detalhes da análise
         */
        showAnalysisDetails: function(analysisId) {
            console.log('🔍 Mostrando detalhes da análise:', analysisId);
            // Implementar modal de detalhes se necessário
            ARITANA.showNotification(`Detalhes da análise ${analysisId}`, 'info');
        },

        /**
         * Atualiza dados do mapa
         */
        async refresh() {
            console.log('🔄 Atualizando dados do mapa...');
            await this.loadMarkers();
            ARITANA.showNotification('Mapa atualizado com sucesso', 'success');
        }
    };
}

// Auto-inicializar quando o sistema principal estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (window.ARITANA && window.ARITANA.Map) {
        setTimeout(() => {
            window.ARITANA.Map.init();
        }, 1000); // Aguardar carregamento completo
    }
}); 