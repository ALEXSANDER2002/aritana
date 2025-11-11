/**
 * Melhorias de UI e correções de bugs visuais - Sistema ARITANA
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar melhorias de UI
    initializeUIImprovements();
});

function initializeUIImprovements() {
    // Melhorar tooltips
    initializeTooltips();
    
    // Melhorar animações
    initializeAnimations();
    
    // Corrigir problemas de responsividade
    fixResponsiveIssues();
    
    // Melhorar tratamento de erros visuais
    improveErrorHandling();
    
    // Adicionar loading states
    addLoadingStates();
    
    // Melhorar acessibilidade
    improveAccessibility();
}

// Inicializar tooltips
function initializeTooltips() {
    // Adicionar tooltips para botões de ação
    const actionButtons = document.querySelectorAll('.btn-action');
    actionButtons.forEach(button => {
        if (!button.title && button.textContent) {
            const text = button.textContent.trim();
            if (text.includes('Ver')) button.title = 'Visualizar detalhes da embarcação';
            if (text.includes('Mapa')) button.title = 'Ver localização no mapa';
            if (text.includes('Tentar')) button.title = 'Tentar carregar novamente';
        }
    });
    
    // Tooltips para estatísticas
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const parent = stat.closest('.stat-card');
        if (parent) {
            const description = parent.querySelector('.text-muted');
            if (description) {
                stat.title = description.textContent + ' - Clique para mais detalhes';
            }
        }
    });
}

// Inicializar animações suaves
function initializeAnimations() {
    // Animação de entrada para cards
    const cards = document.querySelectorAll('.card, .stat-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animação de hover melhorada para botões
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Corrigir problemas de responsividade
function fixResponsiveIssues() {
    // Ajustar tabelas em dispositivos móveis
    const tables = document.querySelectorAll('.table-responsive');
    tables.forEach(table => {
        if (window.innerWidth < 768) {
            table.style.fontSize = '0.85rem';
        }
    });
    
    // Ajustar gráficos em dispositivos móveis
    const chartContainers = document.querySelectorAll('#legalityChart, #regionChart');
    chartContainers.forEach(container => {
        if (window.innerWidth < 576) {
            container.style.height = '200px';
        }
    });
    
    // Ajustar mapa em dispositivos móveis
    const mapContainer = document.getElementById('map');
    if (mapContainer && window.innerWidth < 576) {
        mapContainer.style.height = '300px';
    }
}

// Melhorar tratamento de erros visuais
function improveErrorHandling() {
    // Interceptar erros de imagem
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEwMCA4OC45NTQzIDkxLjA0NTcgODAgODAgODBDNjguOTU0MyA4MCA2MCA4OC45NTQzIDYwIDEwMEM2MCAxMTEuMDQ2IDY4Ljk1NDMgMTIwIDgwIDEyMEM5MS4wNDU3IDEyMCAxMDAgMTExLjA0NiAxMDAgMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
            this.alt = 'Imagem não disponível';
            this.title = 'Falha ao carregar imagem';
        });
    });
    
    // Adicionar retry automático para recursos que falharam
    window.addEventListener('error', function(e) {
        if (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
            console.warn('Recurso falhou ao carregar:', e.target.src || e.target.href);
            showRetryNotification();
        }
    }, true);
}

// Adicionar estados de carregamento
function addLoadingStates() {
    // Loading state para formulários
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
                
                // Restaurar após 30 segundos (timeout)
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitBtn.dataset.originalText || 'Enviar';
                }, 30000);
            }
        });
    });
    
    // Loading state para links que fazem navegação
    const navLinks = document.querySelectorAll('.nav-link, .header-nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Adicionar pequeno delay visual
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 200);
        });
    });
}

// Melhorar acessibilidade
function improveAccessibility() {
    // Adicionar atributos ARIA
    const buttons = document.querySelectorAll('.btn-action');
    buttons.forEach(button => {
        if (!button.getAttribute('aria-label')) {
            button.setAttribute('aria-label', button.textContent.trim() || 'Ação');
        }
    });
    
    // Melhorar navegação por teclado
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
    focusableElements.forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid #4caf50';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = '';
            this.style.outlineOffset = '';
        });
    });
    
    // Adicionar indicadores visuais para elementos interativos
    const interactiveElements = document.querySelectorAll('.stat-card, .embarcacao-row');
    interactiveElements.forEach(element => {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
    });
}

// Mostrar notificação de retry
function showRetryNotification() {
    if (document.querySelector('.retry-notification')) return;
    
    const notification = document.createElement('div');
    notification.className = 'retry-notification alert alert-info alert-dismissible fade show position-fixed';
    notification.style.bottom = '20px';
    notification.style.left = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.innerHTML = `
        <i class="fas fa-wifi me-2"></i>
        Alguns recursos podem não ter carregado. 
        <button class="btn btn-sm btn-outline-info ms-2" onclick="location.reload()">
            Recarregar
        </button>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

// Função para smooth scroll
function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Melhorar performance de scroll
let ticking = false;
function updateScrollEffects() {
    const scrollY = window.scrollY;
    
    // Parallax suave para o header
    const header = document.querySelector('.header-section');
    if (header) {
        header.style.transform = `translateY(${scrollY * 0.1}px)`;
    }
    
    // Fade in para elementos ao fazer scroll
    const elements = document.querySelectorAll('.fade-in');
    elements.forEach(element => {
        const elementTop = element.offsetTop;
        const elementVisible = 150;
        
        if (scrollY > elementTop - window.innerHeight + elementVisible) {
            element.classList.add('active');
        }
    });
    
    ticking = false;
}

window.addEventListener('scroll', function() {
    if (!ticking) {
        requestAnimationFrame(updateScrollEffects);
        ticking = true;
    }
});

// Adicionar classe fade-in aos elementos
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.card:not(.fade-in)');
    cards.forEach(card => {
        card.classList.add('fade-in');
    });
});

// Adicionar CSS para fade-in
const fadeInCSS = `
    .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }
    
    .fade-in.active {
        opacity: 1;
        transform: translateY(0);
    }
`;

const style = document.createElement('style');
style.textContent = fadeInCSS;
document.head.appendChild(style);

// Expor funções globalmente
window.smoothScrollTo = smoothScrollTo;
window.showRetryNotification = showRetryNotification;
window.initializeUIImprovements = initializeUIImprovements;
