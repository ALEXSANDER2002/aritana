"""
Modelos para o sistema ARITANA de monitoramento de embarcações.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class StatusEmbarcacao(models.TextChoices):
    """Choices para status de legalidade da embarcação."""
    LEGAL = 'legal', 'Legal'
    ILEGAL = 'ilegal', 'Ilegal'
    EM_ANALISE = 'em_analise', 'Em Análise'


class AnaliseEmbarcacao(models.Model):
    """
    Modelo para armazenar análises de embarcações processadas pelo sistema.
    """
    # Informações da imagem
    imagem = models.ImageField(
        upload_to='embarcacoes/%Y/%m/%d/',
        verbose_name='Imagem da Embarcação',
        null=True,
        blank=True
    )
    nome_arquivo = models.CharField(
        max_length=255,
        verbose_name='Nome do Arquivo'
    )
    
    # Resultados da análise
    status = models.CharField(
        max_length=20,
        choices=StatusEmbarcacao.choices,
        default=StatusEmbarcacao.EM_ANALISE,
        verbose_name='Status de Legalidade'
    )
    probabilidade = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text='Probabilidade em porcentagem (0-100)',
        verbose_name='Probabilidade'
    )
    
    # Localização
    latitude = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
        verbose_name='Latitude'
    )
    longitude = models.FloatField(
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
        verbose_name='Longitude'
    )
    
    # Metadados
    data_analise = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data da Análise'
    )
    data_atualizacao = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Atualização'
    )
    
    # Informações técnicas da análise
    modelo_ia_utilizado = models.CharField(
        max_length=100,
        default='YOLOv8',
        verbose_name='Modelo de IA Utilizado'
    )
    tempo_processamento = models.FloatField(
        null=True,
        blank=True,
        help_text='Tempo de processamento em segundos',
        verbose_name='Tempo de Processamento (s)'
    )
    
    class Meta:
        verbose_name = 'Análise de Embarcação'
        verbose_name_plural = 'Análises de Embarcações'
        ordering = ['-data_analise']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['data_analise']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"Análise {self.id} - {self.get_status_display()} ({self.probabilidade}%)"
    
    @property
    def coordenadas(self):
        """Retorna as coordenadas formatadas."""
        return f"Lat: {self.latitude:.4f}, Lon: {self.longitude:.4f}"
    
    @property
    def is_legal(self):
        """Verifica se a embarcação é classificada como legal."""
        return self.status == StatusEmbarcacao.LEGAL
    
    @property
    def confianca_alta(self):
        """Verifica se a análise tem alta confiança (>= 80%)."""
        return self.probabilidade >= 80.0


class EstatisticasRegiao(models.Model):
    """
    Modelo para armazenar estatísticas consolidadas por região.
    """
    nome_regiao = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Nome da Região'
    )
    
    # Coordenadas da região (bounding box)
    lat_min = models.FloatField(verbose_name='Latitude Mínima')
    lat_max = models.FloatField(verbose_name='Latitude Máxima')
    lon_min = models.FloatField(verbose_name='Longitude Mínima')
    lon_max = models.FloatField(verbose_name='Longitude Máxima')
    
    # Estatísticas
    total_embarcacoes = models.PositiveIntegerField(
        default=0,
        verbose_name='Total de Embarcações'
    )
    embarcacoes_legais = models.PositiveIntegerField(
        default=0,
        verbose_name='Embarcações Legais'
    )
    embarcacoes_ilegais = models.PositiveIntegerField(
        default=0,
        verbose_name='Embarcações Ilegais'
    )
    
    # Metadados
    ultima_atualizacao = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Atualização'
    )
    
    class Meta:
        verbose_name = 'Estatísticas da Região'
        verbose_name_plural = 'Estatísticas das Regiões'
        ordering = ['nome_regiao']
    
    def __str__(self):
        return self.nome_regiao
    
    @property
    def taxa_legalidade(self):
        """Calcula a taxa de legalidade em porcentagem."""
        if self.total_embarcacoes == 0:
            return 0
        return (self.embarcacoes_legais / self.total_embarcacoes) * 100 