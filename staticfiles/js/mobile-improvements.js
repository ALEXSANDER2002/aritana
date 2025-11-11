/**
 * Melhorias Mobile para Sistema ARITANA
 * Otimizações específicas para dispositivos móveis
 */

// Detectar se é dispositivo móvel
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detectar orientação do dispositivo
function getOrientation() {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// Otimizar mapa para mobile
function optimizeMapForMobile() {
    if (!isMobile()) return;
    
    // Verificar se Leaflet está disponível
    if (typeof L === 'undefined') {
        console.log('Leaflet não carregado ainda, aguardando...');
        setTimeout(() => optimizeMapForMobile(), 1000);
        return;
    }
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer || !window.currentMap) return;
    
    // Ajustar altura do mapa para mobile
    if (getOrientation() === 'portrait') {
        mapContainer.style.height = '300px';
    } else {
        mapContainer.style.height = '250px';
    }
    
    // Redimensionar mapa
    setTimeout(() => {
        if (window.currentMap) {
            try {
                window.currentMap.invalidateSize();
            } catch (error) {
                console.warn('Erro ao redimensionar mapa:', error);
            }
        }
    }, 300);
}

// Otimizar gráficos para mobile
function optimizeChartsForMobile() {
    if (!isMobile()) return;
    
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.log('Chart.js não carregado ainda, aguardando...');
        setTimeout(() => optimizeChartsForMobile(), 1000);
        return;
    }
    
    const charts = document.querySelectorAll('canvas');
    charts.forEach(canvas => {
        try {
            const chart = Chart.getChart(canvas);
            if (chart) {
                // Redimensionar gráfico
                chart.resize();
            }
        } catch (error) {
            console.warn('Erro ao otimizar gráfico:', error);
        }
    });
}

// Melhorar navegação por toque
function enhanceTouchNavigation() {
    if (!isMobile()) return;
    
    // Adicionar feedback tátil para botões
    const buttons = document.querySelectorAll('.btn, .nav-link, .page-link');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Melhorar scroll suave
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Otimizar formulários para mobile
function optimizeFormsForMobile() {
    if (!isMobile()) return;
    
    // Melhorar inputs para mobile
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        // Adicionar padding extra para touch
        input.style.padding = '12px 15px';
        
        // Evitar zoom no iOS
        if (input.type === 'text' || input.type === 'email' || input.type === 'tel') {
            input.style.fontSize = '16px';
        }
    });
    
    // Melhorar área de upload para mobile
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        });
        
        uploadArea.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.backgroundColor = '';
            document.getElementById('fileInput').click();
        });
    }
}

// Otimizar tabelas para mobile
function optimizeTablesForMobile() {
    if (!isMobile()) return;
    
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        // Adicionar scroll horizontal se necessário
        if (!table.closest('.table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
        
        // Melhorar células para touch
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.style.padding = '12px 8px';
            cell.style.minHeight = '44px'; // Altura mínima para touch
        });
    });
}

// Melhorar modais para mobile
function optimizeModalsForMobile() {
    if (!isMobile()) return;
    
    // Ajustar altura dos modais
    const modals = document.querySelectorAll('.modal-dialog');
    modals.forEach(modal => {
        modal.style.maxHeight = '90vh';
        modal.style.margin = '1rem';
    });
    
    // Melhorar botões de modal
    const modalButtons = document.querySelectorAll('.modal-footer .btn');
    modalButtons.forEach(button => {
        button.style.padding = '12px 20px';
        button.style.fontSize = '1rem';
    });
}

// Otimizar paginação para mobile
function optimizePaginationForMobile() {
    if (!isMobile()) return;
    
    const paginations = document.querySelectorAll('.pagination');
    paginations.forEach(pagination => {
        const links = pagination.querySelectorAll('.page-link');
        links.forEach(link => {
            link.style.padding = '10px 12px';
            link.style.minWidth = '44px';
            link.style.minHeight = '44px';
            link.style.display = 'flex';
            link.style.alignItems = 'center';
            link.style.justifyContent = 'center';
        });
    });
}

// Melhorar performance em mobile
function optimizePerformanceForMobile() {
    if (!isMobile()) return;
    
    // Reduzir animações em mobile para melhor performance
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            * {
                animation-duration: 0.2s !important;
                transition-duration: 0.2s !important;
            }
            
            .card:hover {
                transform: none !important;
            }
            
            .btn:hover {
                transform: none !important;
            }
        }
        
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Detectar mudanças de orientação
function handleOrientationChange() {
    setTimeout(() => {
        optimizeMapForMobile();
        optimizeChartsForMobile();
    }, 500);
}

// Melhorar acessibilidade mobile
function enhanceMobileAccessibility() {
    if (!isMobile()) return;
    
    // Aumentar área de toque para elementos pequenos
    const smallElements = document.querySelectorAll('.btn-sm, .btn-xs, .page-link');
    smallElements.forEach(element => {
        element.style.minHeight = '44px';
        element.style.minWidth = '44px';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
    });
    
    // Melhorar labels para screen readers
    const icons = document.querySelectorAll('i[class*="fas"]');
    icons.forEach(icon => {
        if (!icon.getAttribute('aria-label') && !icon.getAttribute('title')) {
            const parent = icon.parentElement;
            if (parent && parent.textContent.trim()) {
                icon.setAttribute('aria-hidden', 'true');
            }
        }
    });
}

// Inicializar melhorias mobile
function initMobileImprovements() {
    if (!isMobile()) return;
    
    console.log('Inicializando melhorias mobile...');
    
    // Aplicar otimizações
    optimizeMapForMobile();
    optimizeChartsForMobile();
    enhanceTouchNavigation();
    optimizeFormsForMobile();
    optimizeTablesForMobile();
    optimizeModalsForMobile();
    optimizePaginationForMobile();
    optimizePerformanceForMobile();
    enhanceMobileAccessibility();
    
    // Adicionar listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Otimizar após carregamento de imagens
    window.addEventListener('load', () => {
        setTimeout(() => {
            optimizeMapForMobile();
            optimizeChartsForMobile();
        }, 1000);
    });
    
    console.log('Melhorias mobile aplicadas com sucesso!');
}

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileImprovements);
} else {
    initMobileImprovements();
}

// Expor funções globalmente para uso em outros scripts
window.mobileOptimizations = {
    isMobile,
    getOrientation,
    optimizeMapForMobile,
    optimizeChartsForMobile,
    enhanceTouchNavigation,
    optimizeFormsForMobile,
    optimizeTablesForMobile,
    optimizeModalsForMobile,
    optimizePaginationForMobile,
    optimizePerformanceForMobile,
    enhanceMobileAccessibility,
    initMobileImprovements
};
