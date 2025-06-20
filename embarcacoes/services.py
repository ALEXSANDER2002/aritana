"""
Serviços para processamento de imagens e análise de embarcações.
"""
import random
import time
from typing import Dict, Any
from django.core.files.uploadedfile import InMemoryUploadedFile
from .models import StatusEmbarcacao


class ProcessadorImagemService:
    """
    Serviço para processamento de imagens de embarcações usando IA.
    """
    
    @staticmethod
    def processar_imagem(imagem: InMemoryUploadedFile) -> Dict[str, Any]:
        """
        Processa uma imagem de embarcação e retorna a análise.
        
        Args:
            imagem: Arquivo de imagem uploadado
            
        Returns:
            Dict contendo status, probabilidade e localização
        """
        # Simular processamento de IA (em produção, usar modelo real)
        time.sleep(random.uniform(1.5, 3.0))  # Simular tempo de processamento
        
        # Gerar resultado simulado baseado em probabilidades realistas
        probabilidade = random.uniform(75, 99)
        
        # Simular detecção de status com base na probabilidade
        if probabilidade > 85:
            status = random.choice([StatusEmbarcacao.LEGAL, StatusEmbarcacao.ILEGAL])
        else:
            status = StatusEmbarcacao.EM_ANALISE
        
        # Gerar coordenadas simuladas na região de Belém do Pará
        # Área aproximada do estuário do rio Pará
        lat_base = -1.4558
        lon_base = -48.5034
        
        # Adicionar variação para simular diferentes localizações
        latitude = lat_base + random.uniform(-0.05, 0.05)
        longitude = lon_base + random.uniform(-0.05, 0.05)
        
        return {
            'status': status,
            'probabilidade': round(probabilidade, 1),
            'localizacao': {
                'lat': round(latitude, 6),
                'lon': round(longitude, 6)
            },
            'confianca': 'alta' if probabilidade > 85 else 'media'
        }
    
    @staticmethod
    def validar_imagem(imagem: InMemoryUploadedFile) -> Dict[str, Any]:
        """
        Valida se a imagem está no formato correto para análise.
        
        Args:
            imagem: Arquivo de imagem uploadado
            
        Returns:
            Dict contendo resultado da validação
        """
        # Verificar tipo de arquivo
        tipos_validos = ['image/jpeg', 'image/jpg', 'image/png']
        if imagem.content_type not in tipos_validos:
            return {
                'valido': False,
                'erro': 'Tipo de arquivo não suportado'
            }
        
        # Verificar tamanho
        tamanho_max = 10 * 1024 * 1024  # 10MB
        if imagem.size > tamanho_max:
            return {
                'valido': False,
                'erro': 'Arquivo muito grande'
            }
        
        # Verificar tamanho mínimo
        tamanho_min = 1024  # 1KB
        if imagem.size < tamanho_min:
            return {
                'valido': False,
                'erro': 'Arquivo muito pequeno'
            }
        
        return {
            'valido': True,
            'tamanho': imagem.size,
            'tipo': imagem.content_type
        }


class EstatisticasService:
    """
    Serviço para cálculo e atualização de estatísticas do sistema.
    """
    
    @staticmethod
    def calcular_estatisticas_gerais() -> Dict[str, Any]:
        """
        Calcula estatísticas gerais do sistema.
        
        Returns:
            Dict contendo estatísticas consolidadas
        """
        from .models import AnaliseEmbarcacao
        from django.db.models import Count, Avg, Q
        
        # Estatísticas básicas
        total = AnaliseEmbarcacao.objects.count()
        legais = AnaliseEmbarcacao.objects.filter(status=StatusEmbarcacao.LEGAL).count()
        ilegais = AnaliseEmbarcacao.objects.filter(status=StatusEmbarcacao.ILEGAL).count()
        
        # Probabilidade média
        prob_media = AnaliseEmbarcacao.objects.aggregate(
            media=Avg('probabilidade')
        )['media'] or 0
        
        # Taxa de legalidade
        taxa_legalidade = (legais / total * 100) if total > 0 else 0
        
        return {
            'total_embarcacoes': total,
            'embarcacoes_legais': legais,
            'embarcacoes_ilegais': ilegais,
            'taxa_legalidade': round(taxa_legalidade, 2),
            'probabilidade_media': round(prob_media, 1),
            'confiabilidade': 'alta' if prob_media > 85 else 'media'
        }
    
    @staticmethod
    def obter_dados_temporais(periodo_dias: int = 30) -> Dict[str, Any]:
        """
        Obtém dados temporais para gráficos.
        
        Args:
            periodo_dias: Período em dias para análise
            
        Returns:
            Dict contendo dados temporais
        """
        from .models import AnaliseEmbarcacao
        from django.utils import timezone
        from datetime import timedelta
        
        data_limite = timezone.now() - timedelta(days=periodo_dias)
        
        # Análises por período
        analises = AnaliseEmbarcacao.objects.filter(
            data_analise__gte=data_limite
        ).extra({
            'dia': "date(data_analise)"
        }).values('dia').annotate(
            total=Count('id'),
            legais=Count('id', filter=Q(status=StatusEmbarcacao.LEGAL)),
            ilegais=Count('id', filter=Q(status=StatusEmbarcacao.ILEGAL))
        ).order_by('dia')
        
        return {
            'periodo_dias': periodo_dias,
            'dados_diarios': list(analises)
        } 