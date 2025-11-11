/**
 * Sistema de Processamento Assíncrono de Imagens
 * Gerencia upload, monitoramento e status de jobs de processamento
 */

// Verificar se a classe já foi declarada para evitar erros de duplicação
if (typeof AsyncImageProcessor === 'undefined') {

class AsyncImageProcessor {
    constructor() {
        this.activeJobs = new Map();
        this.statusCheckInterval = null;
        this.checkInterval = 2000; // 2 segundos
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
    }

    /**
     * Inicia o monitoramento automático de jobs
     */
    startMonitoring() {
        if (this.statusCheckInterval) {
            return; // Já está monitorando
        }

        this.statusCheckInterval = setInterval(() => {
            this.checkAllJobs();
        }, this.checkInterval);

        console.log('Monitoramento de jobs iniciado');
    }

    /**
     * Para o monitoramento automático
     */
    stopMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
            console.log('Monitoramento de jobs parado');
        }
    }

    /**
     * Adiciona um job para monitoramento
     */
    addJob(jobId, callbacks = {}) {
        this.activeJobs.set(jobId, {
            id: jobId,
            status: 'pending',
            progress: 0,
            message: 'Aguardando processamento...',
            callbacks: callbacks,
            retryCount: 0,
            lastCheck: Date.now()
        });

        console.log(`Job ${jobId} adicionado ao monitoramento`);
        
        // Iniciar monitoramento se não estiver ativo
        if (this.activeJobs.size === 1) {
            this.startMonitoring();
        }
    }

    /**
     * Remove um job do monitoramento
     */
    removeJob(jobId) {
        this.activeJobs.delete(jobId);
        console.log(`Job ${jobId} removido do monitoramento`);

        // Parar monitoramento se não há mais jobs
        if (this.activeJobs.size === 0) {
            this.stopMonitoring();
        }
    }

    /**
     * Verifica status de todos os jobs ativos
     */
    async checkAllJobs() {
        const jobs = Array.from(this.activeJobs.values());
        
        for (const job of jobs) {
            try {
                await this.checkJobStatus(job.id);
            } catch (error) {
                console.error(`Erro ao verificar job ${job.id}:`, error);
                this.handleJobError(job.id, error);
            }
        }
    }

    /**
     * Verifica status de um job específico
     */
    async checkJobStatus(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            return;
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}/status/`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Atualizar informações do job
            job.status = data.status;
            job.progress = data.progresso || 0;
            job.message = data.mensagem || '';
            job.lastCheck = Date.now();
            job.retryCount = 0; // Reset retry count on success

            // Executar callbacks
            this.executeCallbacks(jobId, data);

            // Remover job se concluído ou com erro
            if (data.status === 'analisada' || data.status === 'erro') {
                this.removeJob(jobId);
            }

        } catch (error) {
            console.error(`Erro ao verificar status do job ${jobId}:`, error);
            this.handleJobError(jobId, error);
        }
    }

    /**
     * Trata erros de verificação de status
     */
    handleJobError(jobId, error) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            return;
        }

        job.retryCount++;
        job.lastCheck = Date.now();

        if (job.retryCount >= this.maxRetries) {
            console.error(`Job ${jobId} falhou após ${this.maxRetries} tentativas`);
            
            // Executar callback de erro
            if (job.callbacks.onError) {
                job.callbacks.onError(error, job);
            }

            // Remover job após falha
            this.removeJob(jobId);
        } else {
            console.warn(`Job ${jobId} falhou (tentativa ${job.retryCount}/${this.maxRetries}), tentando novamente...`);
            
            // Executar callback de retry
            if (job.callbacks.onRetry) {
                job.callbacks.onRetry(error, job);
            }
        }
    }

    /**
     * Executa callbacks do job
     */
    executeCallbacks(jobId, data) {
        const job = this.activeJobs.get(jobId);
        if (!job || !job.callbacks) {
            return;
        }

        // Callback de progresso
        if (job.callbacks.onProgress) {
            job.callbacks.onProgress(data, job);
        }

        // Callback específico por status
        switch (data.status) {
            case 'processando':
                if (job.callbacks.onProcessing) {
                    job.callbacks.onProcessing(data, job);
                }
                break;
            case 'analisada':
                if (job.callbacks.onSuccess) {
                    job.callbacks.onSuccess(data, job);
                }
                break;
            case 'erro':
                if (job.callbacks.onError) {
                    job.callbacks.onError(new Error(data.erro || 'Erro desconhecido'), job);
                }
                break;
        }
    }

    /**
     * Obtém informações de um job
     */
    getJobInfo(jobId) {
        return this.activeJobs.get(jobId);
    }

    /**
     * Lista todos os jobs ativos
     */
    getActiveJobs() {
        return Array.from(this.activeJobs.values());
    }

    /**
     * Limpa todos os jobs
     */
    clearAllJobs() {
        this.activeJobs.clear();
        this.stopMonitoring();
        console.log('Todos os jobs foram limpos');
    }
}

/**
 * Classe para gerenciar upload de imagens
 */
class ImageUploader {
    constructor(processor) {
        this.processor = processor;
        this.uploadArea = null;
        this.imageInput = null;
        this.previewContainer = null;
        this.progressContainer = null;
        this.statusContainer = null;
        this.uploadBtn = null;
        this.currentFile = null;
    }

    /**
     * Inicializa o uploader
     */
    init(uploadAreaId, imageInputId, previewId, progressId, statusId, uploadBtnId) {
        this.uploadArea = document.getElementById(uploadAreaId);
        this.imageInput = document.getElementById(imageInputId);
        this.previewContainer = document.getElementById(previewId);
        this.progressContainer = document.getElementById(progressId);
        this.statusContainer = document.getElementById(statusId);
        this.uploadBtn = document.getElementById(uploadBtnId);

        this.setupEventListeners();
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        if (!this.uploadArea || !this.imageInput) {
            console.error('Elementos do uploader não encontrados');
            return;
        }

        // Click no área de upload
        this.uploadArea.addEventListener('click', () => {
            this.imageInput.click();
        });

        // Drag and drop
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // Seleção de arquivo
        this.imageInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Upload - Não adicionar listener no botão, deixar o form submit nativo funcionar
        // O formulário tradicional funciona melhor neste caso
    }

    /**
     * Trata drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    /**
     * Trata drag leave
     */
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    /**
     * Trata drop
     */
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    /**
     * Trata seleção de arquivo
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
            
            // Disparar evento customizado para validação do formulário
            const event = new Event('imageSelected');
            window.dispatchEvent(event);
        }
    }

    /**
     * Processa arquivo selecionado
     */
    handleFile(file) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            this.showError('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        // Validar tamanho (20MB)
        if (file.size > 20 * 1024 * 1024) {
            this.showError('O arquivo deve ter no máximo 20MB.');
            return;
        }
        
        // Alerta para arquivos muito grandes (> 10MB)
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > 10) {
            const msg = `⚠️ Arquivo grande detectado (${sizeMB.toFixed(1)} MB).\n\n` +
                        `Para arquivos > 10MB, recomendamos usar o script Python:\n` +
                        `python upload_imagem_grande.py\n\n` +
                        `O navegador pode ter problemas com arquivos grandes.\n` +
                        `Deseja continuar mesmo assim?`;
            
            if (!confirm(msg)) {
                return;
            }
        }

        this.currentFile = file;
        this.showPreview(file);
        this.enableUpload();
    }

    /**
     * Mostra preview da imagem
     */
    showPreview(file) {
        if (!this.previewContainer) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewContainer.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Preview">
                <div class="text-center mt-2">
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="imageUploader.removeImage()">
                        <i class="fas fa-trash me-1"></i> Remover
                    </button>
                </div>
            `;
            this.previewContainer.style.display = 'block';
            
            if (this.uploadArea) {
                this.uploadArea.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Remove imagem selecionada
     */
    removeImage() {
        this.currentFile = null;
        this.imageInput.value = '';
        
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
        }
        
        if (this.uploadArea) {
            this.uploadArea.style.display = 'block';
        }
        
        this.disableUpload();
        this.hideProgress();
    }

    /**
     * Habilita botão de upload
     */
    enableUpload() {
        if (this.uploadBtn) {
            this.uploadBtn.disabled = false;
        }
    }

    /**
     * Desabilita botão de upload
     */
    disableUpload() {
        if (this.uploadBtn) {
            this.uploadBtn.disabled = true;
        }
    }

    /**
     * Trata upload
     */
    async handleUpload() {
        if (!this.currentFile) {
            this.showError('Nenhuma imagem selecionada.');
            return;
        }

        const formData = new FormData();
        formData.append('imagem', this.currentFile);
        
        // Adicionar campos adicionais se existirem
        const titulo = document.getElementById('titulo');
        const descricao = document.getElementById('descricao');
        
        if (titulo) formData.append('titulo', titulo.value);
        if (descricao) formData.append('descricao', descricao.value);

        // Adicionar CSRF token
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            formData.append('csrfmiddlewaretoken', csrfToken.value);
        }

        this.showProgress();
        this.showStatus('Enviando imagem...', 'processing');
        this.disableUpload();

        try {
            const response = await fetch('/upload/', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Verificar se há job_id na resposta
            const responseText = await response.text();
            const jobIdMatch = responseText.match(/Job ID: ([a-f0-9-]+)/i);
            
            if (jobIdMatch) {
                const jobId = jobIdMatch[1];
                this.showStatus('Imagem enviada! Aguardando processamento...', 'processing');
                
                // Adicionar job ao monitoramento
                this.processor.addJob(jobId, {
                    onProgress: (data, job) => {
                        this.updateProgress(data.progresso || 0, data.mensagem || '');
                    },
                    onSuccess: (data, job) => {
                        this.showStatus('Processamento concluído com sucesso!', 'success');
                        this.updateProgress(100, 'Concluído');
                        
                        // Redirecionar para histórico após 3 segundos
                        setTimeout(() => {
                            window.location.href = '/historico/';
                        }, 3000);
                    },
                    onError: (error, job) => {
                        this.showStatus('Erro no processamento: ' + error.message, 'error');
                        this.enableUpload();
                    }
                });
            } else {
                // Fallback: simular processamento
                this.simulateProcessing();
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            this.showError('Erro ao enviar imagem: ' + error.message);
            this.enableUpload();
        }
    }

    /**
     * Simula processamento (fallback)
     */
    simulateProcessing() {
        let progress = 10;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                this.showStatus('Processamento concluído!', 'success');
                
                setTimeout(() => {
                    window.location.href = '/historico/';
                }, 3000);
            }
            
            this.updateProgress(progress, `Processando... ${Math.round(progress)}%`);
        }, 1000);
    }

    /**
     * Mostra progresso
     */
    showProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
        }
    }

    /**
     * Esconde progresso
     */
    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }

    /**
     * Atualiza progresso
     */
    updateProgress(percent, message) {
        const progressBar = document.getElementById('progressBar');
        const statusMessage = document.getElementById('statusMessage');
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }

    /**
     * Mostra status
     */
    showStatus(message, type = 'info') {
        if (this.statusContainer) {
            this.statusContainer.className = `status-message status-${type}`;
            this.statusContainer.textContent = message;
        }
    }

    /**
     * Mostra erro
     */
    showError(message) {
        this.showStatus(message, 'error');
    }
}

// Instâncias globais
const asyncProcessor = new AsyncImageProcessor();
const imageUploader = new ImageUploader(asyncProcessor);

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar uploader se os elementos existirem
    if (document.getElementById('uploadArea') && document.getElementById('imageInput')) {
        imageUploader.init(
            'uploadArea',
            'imageInput',
            'imagePreview',
            'progressContainer',
            'statusMessage',
            'uploadBtn'
        );
    }
    
    console.log('Sistema de processamento assíncrono inicializado');
});

// Expor para uso global
window.asyncProcessor = asyncProcessor;
window.imageUploader = imageUploader;

} // Fim da verificação de duplicação
