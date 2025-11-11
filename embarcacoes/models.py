from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class TipoEmbarcacao(models.TextChoices):
    LEGAL = 'legal', 'Embarcação Legal'
    FISCAL = 'fiscal', 'Fiscalização'
    ILEGAL = 'ilegal', 'Embarcação Ilegal'


class StatusAnalise(models.TextChoices):
    PENDENTE = 'pendente', 'Pendente'
    PROCESSANDO = 'processando', 'Processando'
    ANALISADA = 'analisada', 'Analisada'
    APROVADA = 'aprovada', 'Aprovada'
    REJEITADA = 'rejeitada', 'Rejeitada'
    ERRO = 'erro', 'Erro no Processamento'


class Regiao(models.TextChoices):
    BELEM_CENTRO = 'belem_centro', 'Belém Centro'
    ICOARACI = 'icoaraci', 'Icoaraci'
    OUTEIRO = 'outeiro', 'Outeiro'
    MOSQUEIRO = 'mosqueiro', 'Mosqueiro'
    COTIJUBA = 'cotijuba', 'Cotijuba'
    GUAMA = 'guama', 'Guamá'
    ANANINDEUA = 'ananindeua', 'Ananindeua'


class Embarcacao(models.Model):
    nome = models.CharField('Nome da Embarcação', max_length=200)
    tipo = models.CharField(
        'Tipo',
        max_length=10,
        choices=TipoEmbarcacao.choices,
        default=TipoEmbarcacao.LEGAL
    )
    regiao = models.CharField(
        'Região',
        max_length=20,
        choices=Regiao.choices,
        default=Regiao.BELEM_CENTRO
    )
    latitude = models.DecimalField(
        'Latitude', 
        max_digits=10, 
        decimal_places=7,
        validators=[
            MinValueValidator(Decimal('-2.0')),  # Sul de Belém
            MaxValueValidator(Decimal('-0.5'))   # Norte de Belém
        ]
    )
    longitude = models.DecimalField(
        'Longitude', 
        max_digits=10, 
        decimal_places=7,
        validators=[
            MinValueValidator(Decimal('-49.0')),  # Oeste de Belém
            MaxValueValidator(Decimal('-47.5'))   # Leste de Belém
        ]
    )
    descricao = models.TextField('Descrição', blank=True, null=True)
    data_registro = models.DateTimeField('Data de Registro', default=timezone.now)
    data_atualizacao = models.DateTimeField('Última Atualização', auto_now=True)
    ativa = models.BooleanField('Ativa', default=True)
    
    class Meta:
        verbose_name = 'Embarcação'
        verbose_name_plural = 'Embarcações'
        ordering = ['-data_registro']
        indexes = [
            models.Index(fields=['tipo']),
            models.Index(fields=['regiao']),
            models.Index(fields=['ativa']),
            models.Index(fields=['data_registro']),
            models.Index(fields=['tipo', 'regiao']),  # Índice composto para filtros
            models.Index(fields=['data_registro', 'ativa']),  # Índice composto para consultas temporais
            models.Index(fields=['latitude', 'longitude']),  # Índice espacial
        ]
    
    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"
    
    @property
    def coordenadas(self):
        """Retorna coordenadas formatadas"""
        return f"{self.latitude}, {self.longitude}"
    
    @property
    def status_color(self):
        """Retorna cor baseada no tipo"""
        colors = {
            TipoEmbarcacao.LEGAL: 'success',
            TipoEmbarcacao.FISCAL: 'primary',
            TipoEmbarcacao.ILEGAL: 'danger'
        }
        return colors.get(self.tipo, 'secondary')
    
    @property
    def total_imagens(self):
        """Retorna total de imagens da embarcação"""
        return self.imagens.count()
    
    def get_imagens_por_status(self):
        """Retorna imagens agrupadas por status"""
        return {
            status: self.imagens.filter(status_analise=status).count()
            for status, _ in StatusAnalise.choices
        }


class ImagemEmbarcacao(models.Model):
    embarcacao = models.ForeignKey(
        Embarcacao,
        on_delete=models.CASCADE,
        related_name='imagens',
        verbose_name='Embarcação'
    )
    imagem = models.ImageField(
        'Imagem',
        upload_to='embarcacoes/%Y/%m/%d/',
        help_text='Formatos aceitos: JPG, PNG, JPEG. Máximo 20MB'
    )
    titulo = models.CharField('Título', max_length=200, blank=True)
    descricao = models.TextField('Descrição', blank=True)
    data_upload = models.DateTimeField('Data do Upload', default=timezone.now)
    data_analise = models.DateTimeField('Data da Análise', blank=True, null=True)
    status_analise = models.CharField(
        'Status da Análise',
        max_length=15,
        choices=StatusAnalise.choices,
        default=StatusAnalise.PENDENTE
    )
    resultado_analise = models.JSONField('Resultado da Análise', blank=True, null=True)
    confiabilidade = models.DecimalField(
        'Confiabilidade',
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    # Campos para processamento assíncrono
    job_id = models.CharField('Job ID', max_length=100, blank=True, null=True, unique=True)
    status_url = models.URLField('Status URL', max_length=500, blank=True, null=True)  # URL para consultar status
    result_url = models.URLField('Result URL', max_length=500, blank=True, null=True)  # URL para buscar resultado
    progresso = models.PositiveIntegerField('Progresso (%)', default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    mensagem_status = models.CharField('Mensagem de Status', max_length=500, blank=True)
    resource_id = models.PositiveIntegerField('Resource ID', blank=True, null=True)
    erro_processamento = models.TextField('Erro no Processamento', blank=True)
    tentativas_consulta = models.PositiveIntegerField('Tentativas de Consulta', default=0)
    
    class Meta:
        verbose_name = 'Imagem da Embarcação'
        verbose_name_plural = 'Imagens das Embarcações'
        ordering = ['-data_upload']
        indexes = [
            models.Index(fields=['status_analise']),
            models.Index(fields=['data_upload']),
            models.Index(fields=['embarcacao', 'status_analise']),  # Índice composto
            models.Index(fields=['data_upload', 'status_analise']),  # Índice composto temporal
            models.Index(fields=['job_id']),  # Índice para busca por job_id
            models.Index(fields=['resource_id']),  # Índice para busca por resource_id
        ]
    
    def __str__(self):
        return f"Imagem de {self.embarcacao.nome} - {self.titulo or 'Sem título'}"
    
    @property
    def tamanho_formatado(self):
        """Retorna tamanho da imagem formatado"""
        try:
            size = self.imagem.size
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            else:
                return f"{size / (1024 * 1024):.1f} MB"
        except:
            return "N/A"
    
    @property
    def status_color(self):
        """Retorna cor baseada no status"""
        colors = {
            StatusAnalise.PENDENTE: 'warning',
            StatusAnalise.PROCESSANDO: 'primary',
            StatusAnalise.ANALISADA: 'info',
            StatusAnalise.APROVADA: 'success',
            StatusAnalise.REJEITADA: 'danger',
            StatusAnalise.ERRO: 'danger'
        }
        return colors.get(self.status_analise, 'secondary')
    
    def marcar_como_analisada(self, resultado=None, confiabilidade=None):
        """Marca imagem como analisada"""
        self.status_analise = StatusAnalise.ANALISADA
        self.data_analise = timezone.now()
        if resultado:
            self.resultado_analise = resultado
        if confiabilidade:
            self.confiabilidade = confiabilidade
        self.save()
    
    def iniciar_processamento(self, job_id, status_url=None, result_url=None):
        """Inicia o processamento assíncrono com URLs da API"""
        self.job_id = job_id
        self.status_url = status_url  # Salvar URL fornecida pela API
        self.result_url = result_url  # Salvar URL de resultado
        self.status_analise = StatusAnalise.PROCESSANDO
        self.progresso = 0
        self.mensagem_status = "Processamento iniciado"
        self.save()
    
    def atualizar_status_processamento(self, status_data):
        """Atualiza status do processamento assíncrono"""
        # Mapear campos da API (inglês) para campos locais (português)
        self.progresso = status_data.get('progress', status_data.get('progresso', 0))
        self.mensagem_status = status_data.get('message', status_data.get('mensagem', ''))
        
        # Mapear status da API para StatusAnalise
        status = status_data.get('status', '').lower()
        
        if status in ['succeeded', 'completed', 'success']:
            self.status_analise = StatusAnalise.ANALISADA
            self.data_analise = timezone.now()
            self.resource_id = status_data.get('resource_id')
        elif status in ['failed', 'error', 'erro']:
            self.status_analise = StatusAnalise.ERRO
            self.erro_processamento = status_data.get('message', 'Erro desconhecido')
        elif status in ['running', 'processing', 'processando']:
            self.status_analise = StatusAnalise.PROCESSANDO
        elif status in ['pending', 'pendente', 'queued']:
            self.status_analise = StatusAnalise.PENDENTE
        
        self.save()
    
    def finalizar_processamento(self, resultado, resource_id=None):
        """Finaliza o processamento com sucesso"""
        self.status_analise = StatusAnalise.ANALISADA
        self.data_analise = timezone.now()
        self.progresso = 100
        self.resultado_analise = resultado
        if resource_id:
            self.resource_id = resource_id
        self.mensagem_status = "Processamento concluído com sucesso"
        self.save()
    
    def marcar_erro_processamento(self, erro):
        """Marca erro no processamento"""
        self.status_analise = StatusAnalise.ERRO
        self.erro_processamento = str(erro)
        self.mensagem_status = "Erro no processamento"
        self.save()


class AnaliseRegional(models.Model):
    regiao = models.CharField('Região', max_length=100)
    mes = models.DateField('Mês de Referência')
    embarcacoes_legais = models.PositiveIntegerField('Embarcações Legais', default=0)
    embarcacoes_ilegais = models.PositiveIntegerField('Embarcações Ilegais', default=0)
    total_fiscalizacoes = models.PositiveIntegerField('Total de Fiscalizações', default=0)
    observacoes = models.TextField('Observações', blank=True)
    data_criacao = models.DateTimeField('Data de Criação', default=timezone.now)
    
    class Meta:
        verbose_name = 'Análise Regional'
        verbose_name_plural = 'Análises Regionais'
        ordering = ['-mes']
        unique_together = ['regiao', 'mes']
    
    def __str__(self):
        return f"{self.regiao} - {self.mes.strftime('%m/%Y')}"
    
    @property
    def total_embarcacoes(self):
        return self.embarcacoes_legais + self.embarcacoes_ilegais
    
    @property
    def percentual_legal(self):
        if self.total_embarcacoes > 0:
            return (self.embarcacoes_legais / self.total_embarcacoes) * 100
        return 0