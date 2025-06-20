/**
 * Statistics Loader - Carrega dados de estatísticas dos endpoints do backend
 */

// Adicionar ao namespace ARITANA
if (window.ARITANA) {
    window.ARITANA.Statistics = {
        /**
         * Inicializa o módulo de estatísticas
         */
        init: function() {
            console.log('📊 Inicializando módulo de estatísticas');
            this.loadData();
            this.setupEventListeners();
        },

        /**
         * Configura event listeners para estatísticas
         */
        setupEventListeners: function() {
            // Event listener para mudança de período
            const distributionPeriod = document.getElementById('distributionPeriod');
            if (distributionPeriod) {
                distributionPeriod.addEventListener('change', () => {
                    this.loadData();
                });
            }

            // Event listener para atualização do heatmap
            const refreshBtn = document.querySelector('[onclick*="refreshHeatmap"]');
            if (refreshBtn) {
                refreshBtn.onclick = () => this.refreshHeatmap();
            }
        },

        /**
         * Carrega dados de estatísticas do backend
         */
        async loadData() {
            try {
                console.log('📊 Carregando dados de estatísticas...');
                
                // Carregar estatísticas do dashboard
                const statsResponse = await fetch('/api/estatisticas-dashboard/');
                if (!statsResponse.ok) throw new Error('Erro ao carregar estatísticas');
                
                const statsData = await statsResponse.json();
                console.log('📊 Dados carregados:', statsData);
                
                // Atualizar cards principais
                this.updateMainCards(statsData);
                
                // Atualizar gráfico de distribuição
                this.updateDistributionChart(statsData);
                
                // Atualizar região de atividade
                this.updateRegionActivity(statsData);
                
                // Atualizar histórico temporal
                this.updateTemporalTrend(statsData);
                
            } catch (error) {
                console.error('❌ Erro ao carregar estatísticas:', error);
                ARITANA.showError('Erro ao carregar estatísticas do sistema');
            }
        },

        /**
         * Atualiza os cards principais de estatísticas
         */
        updateMainCards: function(data) {
            // Total de embarcações
            const totalCount = document.getElementById('totalCount');
            if (totalCount) totalCount.textContent = data.total_embarcacoes || 0;

            // Embarcações legais
            const legalCount = document.getElementById('legalCount');
            if (legalCount) legalCount.textContent = data.total_legais || 0;

            // Embarcações ilegais
            const illegalCount = document.getElementById('illegalCount');
            if (illegalCount) illegalCount.textContent = data.total_irregulares || 0;

            // Taxa de precisão (baseada na distribuição)
            const accuracyRate = document.getElementById('accuracyRate');
            if (accuracyRate) {
                const rate = data.distribuicao_legalidade ? data.distribuicao_legalidade.legal : 0;
                accuracyRate.textContent = `${rate}%`;
            }
        },

        /**
         * Atualiza o gráfico de distribuição (pizza)
         */
        updateDistributionChart: function(data) {
            if (!data.distribuicao_legalidade) return;

            const legal = data.distribuicao_legalidade.legal || 0;
            const irregular = data.distribuicao_legalidade.irregular || 0;

            // Atualizar percentuais na legenda
            const legalPercent = document.getElementById('legalPercent');
            const illegalPercent = document.getElementById('illegalPercent');
            
            if (legalPercent) legalPercent.textContent = `${legal}%`;
            if (illegalPercent) illegalPercent.textContent = `${irregular}%`;

            // Atualizar percentual central
            const totalPercentage = document.getElementById('totalPercentage');
            if (totalPercentage) totalPercentage.textContent = `${legal}%`;

            // Atualizar arcos SVG
            this.updatePieChart(legal, irregular);
        },

        /**
         * Atualiza o gráfico de pizza SVG
         */
        updatePieChart: function(legalPercent, irregularPercent) {
            const legalArc = document.getElementById('legalArc');
            const illegalArc = document.getElementById('illegalArc');

            if (!legalArc || !illegalArc) return;

            const circumference = 2 * Math.PI * 40; // r=40
            const legalLength = (legalPercent / 100) * circumference;
            const irregularLength = (irregularPercent / 100) * circumference;

            // Configurar arco legal (verde)
            legalArc.style.strokeDasharray = `${legalLength} ${circumference}`;
            legalArc.style.strokeDashoffset = '0';

            // Configurar arco irregular (vermelho)
            illegalArc.style.strokeDasharray = `${irregularLength} ${circumference}`;
            illegalArc.style.strokeDashoffset = `-${legalLength}`;
        },

        /**
         * Atualiza a atividade por região
         */
        updateRegionActivity: function(data) {
            if (!data.regioes || !Array.isArray(data.regioes)) return;

            const regionActivity = document.getElementById('regionActivity');
            if (!regionActivity) return;

            // Limpar conteúdo atual
            regionActivity.innerHTML = '';

            // Encontrar o maior valor para normalizar as barras
            const maxTotal = Math.max(...data.regioes.map(r => r.total || 0));

            // Criar elementos para cada região
            data.regioes.forEach(regiao => {
                const percentage = maxTotal > 0 ? (regiao.total / maxTotal) * 100 : 0;
                
                const regionDiv = document.createElement('div');
                regionDiv.className = 'flex items-center justify-between';
                
                regionDiv.innerHTML = `
                    <span class="text-sm text-gray-700">${regiao.nome}</span>
                    <div class="flex items-center space-x-2">
                        <div class="w-24 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                        <span class="text-xs text-gray-500">${regiao.total}</span>
                    </div>
                `;
                
                regionActivity.appendChild(regionDiv);
            });
        },

        /**
         * Atualiza a tendência temporal
         */
        updateTemporalTrend: function(data) {
            if (!data.historico_mensal || !Array.isArray(data.historico_mensal)) return;

            // Calcular médias e tendências
            const totalPorMes = data.historico_mensal.map(mes => 
                (mes.legais || 0) + (mes.irregulares || 0) + (mes.em_analise || 0)
            );

            const avgDaily = Math.round(totalPorMes.reduce((a, b) => a + b, 0) / totalPorMes.length / 30);
            const maxIndex = totalPorMes.indexOf(Math.max(...totalPorMes));
            const peakDay = data.historico_mensal[maxIndex]?.mes || '-';

            // Calcular tendência
            const firstHalf = totalPorMes.slice(0, 3).reduce((a, b) => a + b, 0);
            const secondHalf = totalPorMes.slice(3).reduce((a, b) => a + b, 0);
            const trendDirection = secondHalf > firstHalf ? '↗️ Crescendo' : '↘️ Diminuindo';

            // Atualizar elementos
            const avgDailyEl = document.getElementById('avgDaily');
            const peakDayEl = document.getElementById('peakDay');
            const trendDirectionEl = document.getElementById('trendDirection');

            if (avgDailyEl) avgDailyEl.textContent = avgDaily;
            if (peakDayEl) peakDayEl.textContent = peakDay;
            if (trendDirectionEl) trendDirectionEl.textContent = trendDirection;
        },

        /**
         * Atualiza o heatmap de regiões
         */
        async refreshHeatmap() {
            console.log('🔄 Atualizando heatmap...');
            await this.loadData();
            ARITANA.showNotification('Heatmap atualizado com sucesso', 'success');
        }
    };
}

// Auto-inicializar quando o sistema principal estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (window.ARITANA && window.ARITANA.Statistics) {
        setTimeout(() => {
            window.ARITANA.Statistics.init();
        }, 500); // Aguardar sistema principal
    }
}); 