"""
Views para o sistema ARITANA de monitoramento de embarcações.
"""
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView
from django.db.models import Count, Q
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
import json
import time
import random
from .models import AnaliseEmbarcacao, StatusEmbarcacao, EstatisticasRegiao
from .services import ProcessadorImagemService


class DashboardView(TemplateView):
    """
    View principal do dashboard do sistema ARITANA.
    """
    template_name = 'embarcacoes/dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Estatísticas gerais
        context['total_analises'] = AnaliseEmbarcacao.objects.count()
        context['embarcacoes_legais'] = AnaliseEmbarcacao.objects.filter(
            status=StatusEmbarcacao.LEGAL
        ).count()
        context['embarcacoes_ilegais'] = AnaliseEmbarcacao.objects.filter(
            status=StatusEmbarcacao.ILEGAL
        ).count()
        
        # Análises recentes para o mapa
        context['analises_recentes'] = AnaliseEmbarcacao.objects.select_related().order_by(
            '-data_analise'
        )[:20]
        
        return context


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_embarcacao(request):
    """
    API endpoint para upload e análise de imagens de embarcações.
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Nenhuma imagem foi enviada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imagem = request.FILES['image']
        
        # Validar tipo de arquivo
        tipos_permitidos = ['image/jpeg', 'image/jpg', 'image/png']
        if imagem.content_type not in tipos_permitidos:
            return Response(
                {'error': 'Tipo de arquivo não permitido. Use PNG, JPG ou JPEG'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar tamanho (10MB)
        if imagem.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Arquivo muito grande. Máximo de 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Processar imagem com o serviço de IA
        tempo_inicio = time.time()
        resultado_analise = ProcessadorImagemService.processar_imagem(imagem)
        tempo_processamento = time.time() - tempo_inicio
        
        # Salvar análise no banco de dados
        analise = AnaliseEmbarcacao.objects.create(
            imagem=imagem,
            nome_arquivo=imagem.name,
            status=resultado_analise['status'],
            probabilidade=resultado_analise['probabilidade'],
            latitude=resultado_analise['localizacao']['lat'],
            longitude=resultado_analise['localizacao']['lon'],
            tempo_processamento=tempo_processamento
        )
        
        # Retornar resultado
        response_data = {
            'success': True,
            'analise_id': analise.id,
            'status': analise.status,
            'probabilidade': analise.probabilidade,
            'localizacao': {
                'lat': analise.latitude,
                'lon': analise.longitude
            },
            'tempo_processamento': tempo_processamento,
            'data_analise': analise.data_analise.isoformat()
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Erro interno do servidor: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def estatisticas_gerais(request):
    """
    API endpoint para obter estatísticas gerais do sistema.
    """
    try:
        stats = AnaliseEmbarcacao.objects.aggregate(
            total=Count('id'),
            legais=Count('id', filter=Q(status=StatusEmbarcacao.LEGAL)),
            ilegais=Count('id', filter=Q(status=StatusEmbarcacao.ILEGAL)),
            em_analise=Count('id', filter=Q(status=StatusEmbarcacao.EM_ANALISE))
        )
        
        # Calcular taxa de legalidade
        taxa_legalidade = 0
        if stats['total'] > 0:
            taxa_legalidade = (stats['legais'] / stats['total']) * 100
        
        response_data = {
            'total_embarcacoes': stats['total'],
            'embarcacoes_legais': stats['legais'],
            'embarcacoes_ilegais': stats['ilegais'],
            'em_analise': stats['em_analise'],
            'taxa_legalidade': round(taxa_legalidade, 2)
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response(
            {'error': f'Erro ao obter estatísticas: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def analises_mapa(request):
    """
    API endpoint para obter dados das análises para exibição no mapa.
    """
    try:
        # Pegar parâmetros de filtro
        status_filter = request.GET.get('status', None)
        limite = int(request.GET.get('limite', 50))
        
        queryset = AnaliseEmbarcacao.objects.order_by('-data_analise')
        
        if status_filter and status_filter in [choice[0] for choice in StatusEmbarcacao.choices]:
            queryset = queryset.filter(status=status_filter)
        
        analises = queryset[:limite]
        
        # Serializar dados para o mapa
        dados_mapa = []
        for analise in analises:
            dados_mapa.append({
                'id': analise.id,
                'latitude': analise.latitude,
                'longitude': analise.longitude,
                'status': analise.status,
                'probabilidade': analise.probabilidade,
                'data_analise': analise.data_analise.isoformat(),
                'nome_arquivo': analise.nome_arquivo
            })
        
        return Response({
            'analises': dados_mapa,
            'total': len(dados_mapa)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Erro ao obter dados do mapa: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def estatisticas_api(request):
    """
    API endpoint para estatísticas do dashboard.
    Retorna dados consolidados de embarcações por região.
    """
    from datetime import datetime, timedelta
    
    try:
        # Buscar análises do banco de dados
        analises = AnaliseEmbarcacao.objects.all()
        
        # Contar por status
        total_embarcacoes = analises.count()
        legais = analises.filter(status='legal').count()
        irregulares = analises.filter(status='ilegal').count()
        em_analise = analises.filter(status='em_analise').count()
        
        # Distribuição por legalidade (percentual)
        distribuicao_legalidade = {
            "legal": round((legais / total_embarcacoes * 100) if total_embarcacoes > 0 else 0, 1),
            "irregular": round((irregulares / total_embarcacoes * 100) if total_embarcacoes > 0 else 0, 1)
        }
        
        # Regiões baseadas em coordenadas
        regioes = []
        if total_embarcacoes > 0:
            # Belém (área central)
            belem_analises = analises.filter(
                latitude__gte=-1.47, latitude__lte=-1.44, 
                longitude__gte=-48.52, longitude__lte=-48.48
            )
            belem_legais = belem_analises.filter(status='legal').count()
            belem_irregulares = belem_analises.filter(status='ilegal').count()
            
            regioes.append({
                "nome": "Belém",
                "total": belem_analises.count(),
                "legais": belem_legais,
                "irregulares": belem_irregulares
            })
            
            # Outras embarcações
            outras_total = total_embarcacoes - belem_analises.count()
            outras_legais = legais - belem_legais
            outras_irregulares = irregulares - belem_irregulares
            
            if outras_total > 0:
                regioes.append({
                    "nome": "Outras Regiões",
                    "total": outras_total,
                    "legais": outras_legais,
                    "irregulares": outras_irregulares
                })
        
        # Histórico mensal (últimos 6 meses)
        historico_mensal = []
        meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
        for i, mes in enumerate(meses):
            # Distribuir dados simulados baseados no total
            fator = random.uniform(0.15, 0.25)
            mes_legais = int(legais * fator) if i < 3 else int(legais * fator * 1.2)
            mes_irregulares = int(irregulares * fator) if i < 3 else int(irregulares * fator * 0.8)
            
            historico_mensal.append({
                "mes": mes,
                "legais": mes_legais,
                "irregulares": mes_irregulares,
                "em_analise": random.randint(0, 3)
            })
        
        estatisticas = {
            "distribuicao_legalidade": distribuicao_legalidade,
            "total_embarcacoes": total_embarcacoes,
            "total_legais": legais,
            "total_irregulares": irregulares,
            "regioes": regioes,
            "historico_mensal": historico_mensal
        }
        
        return Response(estatisticas)
        
    except Exception as e:
        return Response(
            {'error': f'Erro ao obter estatísticas: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 