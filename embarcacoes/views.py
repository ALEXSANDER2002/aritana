from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Count, Q
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
import json
import logging

from .models import Embarcacao, ImagemEmbarcacao, AnaliseRegional, TipoEmbarcacao, StatusAnalise
from .api_client import api_client

logger = logging.getLogger(__name__)


def _obter_classificacao_local(imagem):
    """Deriva classificação para uploads locais conforme status/resultado."""
    resultado = imagem.resultado_analise

    if imagem.status_analise == StatusAnalise.ANALISADA and resultado:
        if isinstance(resultado, list) and resultado:
            primeiro = resultado[0]
            classificacao = primeiro.get('classificacao') if isinstance(primeiro, dict) else None
        elif isinstance(resultado, dict):
            classificacao = resultado.get('classificacao')
        else:
            classificacao = None

        if classificacao:
            return str(classificacao).lower()
        return 'analisada'

    status_map = {
        StatusAnalise.PROCESSANDO: 'processando',
        StatusAnalise.PENDENTE: 'pendente',
        StatusAnalise.ERRO: 'erro',
        StatusAnalise.APROVADA: 'aprovada',
        StatusAnalise.REJEITADA: 'rejeitada',
    }
    return status_map.get(imagem.status_analise, 'processando')


def _normalizar_url(request, url):
    if not url:
        return None
    url = str(url)
    if url.startswith('http://') or url.startswith('https://'):
        return url
    return request.build_absolute_uri(url)


def _formatar_upload_local(imagem, request):
    resultado = imagem.resultado_analise
    if isinstance(resultado, list) and resultado:
        primeiro = resultado[0]
        resultado = primeiro if isinstance(primeiro, dict) else {}
    elif not isinstance(resultado, dict):
        resultado = {}

    imagem_processada_url = resultado.get('imagem_processada') or resultado.get('imagem_processada_url')

    return {
        'id': f'local_{imagem.id}',
        'origem': 'local',
        'localidade': imagem.titulo or imagem.embarcacao.nome or 'Upload Local',
        'classificacao': _obter_classificacao_local(imagem),
        'regiao': imagem.embarcacao.regiao,
        'data_cadastro': imagem.data_upload.isoformat(),
        'data_foto': imagem.data_analise.isoformat() if imagem.data_analise else None,
        'latitude': float(imagem.embarcacao.latitude) if imagem.embarcacao.latitude else None,
        'longitude': float(imagem.embarcacao.longitude) if imagem.embarcacao.longitude else None,
        'imagem_url': _normalizar_url(request, imagem.imagem.url) if imagem.imagem else None,
        'imagem_processada_url': _normalizar_url(request, imagem_processada_url),
        'job_id': imagem.job_id,
        'progresso': imagem.progresso,
        'status_local': imagem.get_status_analise_display(),
        'mensagem_status': imagem.mensagem_status,
        'resource_id': str(imagem.resource_id) if imagem.resource_id else None,
        'resultado_api': resultado,
    }


def _processar_upload_imagem(request):
    """Executa o fluxo de upload e disparo do processamento assíncrono."""
    imagem = request.FILES.get('imagem')
    titulo = request.POST.get('titulo', '')
    descricao = request.POST.get('descricao', '')
    regiao = request.POST.get('regiao', '')

    localidade = request.POST.get('localidade', '')
    if not localidade and regiao:
        localidade = regiao

    latitude = request.POST.get('latitude')
    longitude = request.POST.get('longitude')

    try:
        latitude = float(latitude) if latitude else None
    except (ValueError, TypeError):
        latitude = None

    try:
        longitude = float(longitude) if longitude else None
    except (ValueError, TypeError):
        longitude = None

    if not imagem:
        messages.error(request, 'Nenhuma imagem foi selecionada.')
        return {'success': False}

    try:
        embarcacao_padrao, _ = Embarcacao.objects.get_or_create(
            id=1,
            defaults={
                'nome': 'Embarcação Padrão',
                'tipo': TipoEmbarcacao.LEGAL,
                'regiao': 'belem_centro',
                'latitude': -1.4558,
                'longitude': -48.5044,
                'descricao': 'Embarcação padrão para upload de imagens'
            }
        )

        imagem_obj = ImagemEmbarcacao.objects.create(
            embarcacao=embarcacao_padrao,
            imagem=imagem,
            titulo=titulo,
            descricao=descricao,
            status_analise=StatusAnalise.PENDENTE
        )

        if not regiao or regiao.strip() == '':
            regiao = 'Norte'

        if not localidade or localidade.strip() == '':
            localidade = regiao

        if latitude is None:
            latitude = -1.4558

        if longitude is None:
            longitude = -48.5044

        data_foto = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

        if not titulo or titulo.strip() == '':
            titulo = localidade or regiao or 'Embarcação'

        if not descricao or descricao.strip() == '':
            descricao = f'Upload em {datetime.now().strftime("%d/%m/%Y %H:%M")}'

        try:
            imagem.seek(0)
        except Exception as seek_exc:
            logger.warning("Não foi possível reposicionar ponteiro da imagem: %s", seek_exc)

        logger.info(
            "Enviando para API YOLO: regiao=%s, localidade=%s, lat=%s, lng=%s",
            regiao,
            localidade,
            latitude,
            longitude,
        )
        resultado = api_client.enviar_imagem_para_analise(
            imagem,
            titulo=titulo,
            descricao=descricao,
            regiao=regiao,
            localidade=localidade,
            latitude=latitude,
            longitude=longitude,
            data_foto=data_foto
        )

        logger.info("Resultado do envio: %s", resultado)

        if resultado and 'job_id' in resultado:
            imagem_obj.iniciar_processamento(
                job_id=resultado['job_id'],
                status_url=resultado.get('status_url'),
                result_url=resultado.get('result_url')
            )
            messages.success(
                request,
                '✅ Imagem enviada com sucesso! Acompanhe o progresso no histórico.'
            )
            return {
                'success': True,
                'job_id': resultado['job_id'],
                'imagem': imagem_obj,
            }

        erro_msg = f'API não retornou job_id. Resposta: {resultado}'
        logger.error(erro_msg)
        imagem_obj.marcar_erro_processamento(erro_msg)
        messages.error(request, 'Erro ao enviar imagem para análise. API não retornou job_id válido.')
        return {'success': False, 'job_id': None}

    except Exception as exc:
        logger.error("Erro no upload da imagem: %s", exc)
        messages.error(request, f'Erro interno: {str(exc)}')
        return {'success': False}


def dashboard(request):
    """View principal do dashboard ARITANA"""
    
    # Buscar dados da API externa
    dados_api = api_client.get_dados_embarcacoes()
    estatisticas_api = api_client.get_estatisticas_regionais()
    
    # Estatísticas da API ou valores padrão
    if dados_api and 'embarcacoes' in dados_api:
        embarcacoes = dados_api['embarcacoes']
        total_embarcacoes = len(embarcacoes)
        embarcacoes_legais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'legal'])
        embarcacoes_ilegais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'ilegal'])
        # Removido fiscalizações - não existe na API externa
    else:
        total_embarcacoes = 0
        embarcacoes_legais = 0
        embarcacoes_ilegais = 0
        fiscalizacoes = 0
    
    context = {
        'total_embarcacoes': total_embarcacoes,
        'embarcacoes_legais': embarcacoes_legais,
        'embarcacoes_ilegais': embarcacoes_ilegais,
        # Formulário de upload removido - usando apenas API
        'api_connected': dados_api is not None,
    }
    
    return render(request, 'embarcacoes/dashboard.html', context)

def upload_imagem(request):
    """View para upload de imagens com processamento assíncrono"""
    if request.method == 'POST':
        resultado = _processar_upload_imagem(request)
        if resultado.get('success'):
                    cache.clear()
                    return redirect('historico')
    
    # Se GET ou se houve erro, mostrar página de upload
    return render(request, 'embarcacoes/upload_imagem.html')


def upload_teste_grande(request):
    """Página dedicada para testar uploads pesados com resumo de jobs recentes."""
    contexto = {}
    if request.method == 'POST':
        resultado = _processar_upload_imagem(request)
        contexto.update(resultado)
        if resultado.get('success'):
            cache.clear()
    imagens = ImagemEmbarcacao.objects.select_related('embarcacao').order_by('-data_upload')[:15]
    contexto['historico_imagens'] = imagens
    return render(request, 'embarcacoes/upload_teste_grande.html', contexto)


def verificar_status_job(request, job_id):
    """API para verificar status de um job específico"""
    MAX_TENTATIVAS = 30  # 30 tentativas × 3s = 90 segundos (permite fila + processamento)  # Após 15 tentativas (45 segundos), marcar como erro
    
    try:
        # Buscar imagem pelo job_id
        imagem = ImagemEmbarcacao.objects.get(job_id=job_id)
        
        # Incrementar contador de tentativas
        imagem.tentativas_consulta += 1
        imagem.save()
        
        # Verificar status na API FastAPI usando status_url se disponível
        status_data = api_client.verificar_status_job(job_id, status_url=imagem.status_url)
        
        if status_data:
            # Atualizar status local
            imagem.atualizar_status_processamento(status_data)
            
            # Resetar tentativas após sucesso
            imagem.tentativas_consulta = 0
            imagem.save()
            
            # Se processamento concluído, buscar resultado final
            if status_data.get('status') == 'succeeded' and status_data.get('resource_id'):
                resultado = api_client.obter_resultado_processamento(status_data['resource_id'])
                if resultado:
                    imagem.finalizar_processamento(resultado, status_data['resource_id'])
                    cache.clear()
            elif imagem.status_analise == StatusAnalise.ERRO:
                cache.clear()
        else:
            # API não retornou dados (erro 500 ou timeout)
            if imagem.tentativas_consulta >= MAX_TENTATIVAS:
                # Marcar como erro após muitas tentativas
                logger.error(f"Job {job_id} falhou após {MAX_TENTATIVAS} tentativas")
                imagem.status_analise = StatusAnalise.ERRO
                imagem.erro_processamento = f"A API não respondeu após {MAX_TENTATIVAS} tentativas. Job pode ter expirado ou falhado."
                imagem.save()
                cache.clear()
        
        return JsonResponse({
            'job_id': job_id,
            'status': imagem.status_analise,
            'progresso': imagem.progresso,
            'mensagem': imagem.mensagem_status,
            'resource_id': imagem.resource_id,
            'erro': imagem.erro_processamento if imagem.status_analise == StatusAnalise.ERRO else None
        })
        
    except ImagemEmbarcacao.DoesNotExist:
        return JsonResponse({'error': 'Job não encontrado'}, status=404)
    except Exception as e:
        logger.error(f"Erro ao verificar status do job {job_id}: {str(e)}")
        return JsonResponse({'error': 'Erro interno'}, status=500)


def listar_jobs_processamento(request):
    """API para listar jobs em processamento"""
    try:
        jobs_processando = ImagemEmbarcacao.objects.filter(
            status_analise__in=[StatusAnalise.PROCESSANDO, StatusAnalise.PENDENTE]
        ).values(
            'id', 'job_id', 'titulo', 'status_analise', 'progresso', 
            'mensagem_status', 'data_upload'
        )
        
        return JsonResponse({
            'jobs': list(jobs_processando),
            'total': len(jobs_processando)
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar jobs: {str(e)}")
        return JsonResponse({'error': 'Erro interno'}, status=500)


def obter_resultado_processamento(request, resource_id):
    """API para obter resultado do processamento por resource_id"""
    try:
        # Buscar resultado na API externa
        resultado = api_client.obter_resultado_processamento(resource_id)
        
        if resultado:
            # Buscar também a imagem local se existir
            imagem_local = ImagemEmbarcacao.objects.filter(resource_id=resource_id).first()
            
            # Preparar resposta
            response_data = {
                'id': resultado.get('id'),
                'titulo': resultado.get('titulo') or resultado.get('localidade', ''),
                'descricao': resultado.get('descricao', ''),
                'classificacao': resultado.get('classificacao', ''),
                'confianca': resultado.get('confianca', 0),
                'regiao': resultado.get('regiao', ''),
                'imagem_url': resultado.get('imagem', ''),
                'imagem_processada_url': resultado.get('imagem_processada', ''),
                'latitude': resultado.get('latitude'),
                'longitude': resultado.get('longitude'),
                'data_foto': resultado.get('data_foto'),
                'data_cadastro': resultado.get('data_cadastro'),
            }
            
            # Se houver imagem local, usar URL local
            if imagem_local and imagem_local.imagem:
                response_data['imagem_url'] = request.build_absolute_uri(imagem_local.imagem.url)
            
            return JsonResponse(response_data)
        else:
            return JsonResponse({'error': 'Resultado não encontrado'}, status=404)
            
    except Exception as e:
        logger.error(f"Erro ao obter resultado {resource_id}: {str(e)}")
        return JsonResponse({'error': 'Erro interno'}, status=500)


def dados_mapa_json(request):
    """API para fornecer dados do mapa em JSON"""
    # Buscar dados apenas da API externa
    dados_externos = api_client.get_dados_embarcacoes()
    
    if dados_externos and 'embarcacoes' in dados_externos:
        return JsonResponse(dados_externos)
    else:
        # Retornar lista vazia se API não disponível
        return JsonResponse({'embarcacoes': []})

def dados_cache_json(request):
    """API otimizada para cache de navegação - retorna dados completos com cache"""
    from django.core.cache import cache
    
    # Verificar cache primeiro
    cache_key = 'dados_cache_json'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        logger.info("Retornando dados do cache")
        return JsonResponse(cached_data)
    
    # Buscar dados da API externa
    dados_embarcacoes = api_client.get_dados_embarcacoes()
    dados_estatisticas = api_client.get_estatisticas_regionais()
    
    # Ordenar embarcações por data (mais recentes primeiro)
    embarcacoes = dados_embarcacoes.get('embarcacoes', []) if dados_embarcacoes else []
    embarcacoes = sorted(embarcacoes, key=lambda x: x.get('data_cadastro', ''), reverse=True)
    
    response_data = {
        'embarcacoes': embarcacoes,
        'estatisticas': dados_estatisticas or {
            'legalidade': {'legais': 0, 'ilegais': 0},
            'regional': {'meses': [], 'legais': [], 'ilegais': []}
        },
        'timestamp': timezone.now().isoformat(),
        'total': len(embarcacoes)
    }
    
    # Cachear por 10 minutos
    cache.set(cache_key, response_data, 600)
    logger.info("Retornando estatísticas do cache")
    
    return JsonResponse(response_data)


def dados_graficos_json(request):
    """API para fornecer dados dos gráficos em JSON"""
    # Buscar dados apenas da API externa
    estatisticas_externas = api_client.get_estatisticas_regionais()
    
    if estatisticas_externas:
        return JsonResponse(estatisticas_externas)
    else:
        # Retornar dados vazios se API não disponível
        return JsonResponse({
            'legalidade': {
                'legais': 0,
                'ilegais': 0
            },
            'regional': {
                'meses': [],
                'legais': [],
                'ilegais': []
            }
        })


def historico(request):
    """View para página de histórico de análises com paginação otimizada"""
    from django.core.paginator import Paginator
    from django.core.cache import cache
    import time
    
    start_time = time.time()
    
    # Verificar cache primeiro
    cache_key = 'historico_data'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        # Usar dados do cache
        embarcacoes = cached_data['embarcacoes']
        api_connected = cached_data['api_connected']
        total_count = cached_data['total_count']
        logger.info(f"Dados do histórico carregados do cache em {time.time() - start_time:.2f}s")
    else:
        # Buscar dados da API externa
        dados_api = api_client.get_dados_embarcacoes()
        
        if dados_api and 'embarcacoes' in dados_api:
            embarcacoes_api = dados_api['embarcacoes']
            api_connected = True
        else:
            embarcacoes_api = []
            api_connected = False
        
        # Buscar também uploads locais que ainda não estão na API
        uploads_locais = []
        locais_por_resource = {}
        try:
            imagens_locais = ImagemEmbarcacao.objects.select_related('embarcacao').filter(
                status_analise__in=[
                    StatusAnalise.PENDENTE,
                    StatusAnalise.PROCESSANDO,
                    StatusAnalise.ANALISADA,
                    StatusAnalise.ERRO,
                ]
            ).order_by('-data_upload')
            
            for img in imagens_locais:
                dados_local = _formatar_upload_local(img, request)
                resource_id = dados_local.get('resource_id')
                if resource_id:
                    locais_por_resource[resource_id] = dados_local
                if img.status_analise in [StatusAnalise.ANALISADA, StatusAnalise.APROVADA] and resource_id:
                    # Resultado final já disponível via API - evitar duplicidade
                    continue
                uploads_locais.append(dados_local)
        except Exception as e:
            logger.error(f"Erro ao buscar uploads locais: {e}")
        
        # Mesclar dados da API com uploads locais
        embarcacoes_api_enriquecidas = []
        for embarcacao in embarcacoes_api:
            api_item = dict(embarcacao)
            api_item['origem'] = 'api'
            resource_key = str(api_item.get('id') or api_item.get('resource_id') or '')
            local_info = locais_por_resource.get(resource_key)
            if local_info:
                api_item['progresso'] = local_info.get('progresso', 100)
                api_item['mensagem_status'] = local_info.get('mensagem_status', '')
                api_item['status_local'] = local_info.get('status_local', '')
                api_item['job_id'] = local_info.get('job_id')
                api_item['resultado_api'] = local_info.get('resultado_api') or api_item.get('resultado_api')
            else:
                api_item.setdefault('progresso', 100 if api_item.get('classificacao') else 0)
                api_item.setdefault('mensagem_status', '')
                api_item.setdefault('status_local', 'Analisada' if api_item.get('classificacao') else '')
            embarcacoes_api_enriquecidas.append(api_item)

        embarcacoes = uploads_locais + embarcacoes_api_enriquecidas
        
        # Ordenar por data de cadastro (mais recentes primeiro)
        embarcacoes = sorted(embarcacoes, key=lambda x: x.get('data_cadastro', ''), reverse=True)
        
        total_count = len(embarcacoes)
        
        # Cachear dados por 10 minutos
        cache.set(cache_key, {
            'embarcacoes': embarcacoes,
            'api_connected': api_connected,
            'total_count': total_count
        }, 600)
        
        logger.info(f"Dados do histórico carregados da API em {time.time() - start_time:.2f}s")
    
    # Implementar paginação otimizada
    paginator = Paginator(embarcacoes, 20)  # 20 itens por página
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'embarcacoes': page_obj.object_list,
        'api_connected': api_connected,
        'total_count': total_count,
        'load_time': round(time.time() - start_time, 2),
        'timestamp': int(time.time()),  # Para quebrar cache do navegador
    }
    
    return render(request, 'embarcacoes/historico.html', context)


def historico_ajax(request):
    """API para carregar dados do histórico via AJAX com paginação otimizada"""
    from django.core.paginator import Paginator
    from django.core.cache import cache
    import time
    
    start_time = time.time()
    
    # Parâmetros da requisição
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))
    filtro_tipo = request.GET.get('tipo', '')
    filtro_regiao = request.GET.get('regiao', '')
    filtro_busca = request.GET.get('busca', '').lower()
    
    # Verificar cache primeiro
    cache_key = f'historico_ajax_{page}_{page_size}_{filtro_tipo}_{filtro_regiao}_{filtro_busca}'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        logger.info(f"Dados AJAX carregados do cache em {time.time() - start_time:.2f}s")
        response = JsonResponse(cached_data)
        # Impedir cache no navegador para sempre pegar dados frescos
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        return response
    
    # Buscar dados da API externa
    dados_api = api_client.get_dados_embarcacoes()
    
    if dados_api and 'embarcacoes' in dados_api:
        embarcacoes_api = dados_api['embarcacoes']
    else:
        embarcacoes_api = []
    
    # Buscar também uploads locais que ainda não estão na API
    uploads_locais = []
    locais_por_resource = {}
    try:
        imagens_locais = ImagemEmbarcacao.objects.select_related('embarcacao').filter(
            status_analise__in=[
                StatusAnalise.PENDENTE,
                StatusAnalise.PROCESSANDO,
                StatusAnalise.ANALISADA,
                StatusAnalise.ERRO,
            ]
        ).order_by('-data_upload')
        
        for img in imagens_locais:
            dados_local = _formatar_upload_local(img, request)
            resource_id = dados_local.get('resource_id')
            if resource_id:
                locais_por_resource[resource_id] = dados_local
            if img.status_analise in [StatusAnalise.ANALISADA, StatusAnalise.APROVADA] and resource_id:
                continue
            uploads_locais.append(dados_local)
    except Exception as e:
        logger.error(f"Erro ao buscar uploads locais: {e}")
    
    # Mesclar dados da API com uploads locais
    embarcacoes_api_enriquecidas = []
    for embarcacao in embarcacoes_api:
        api_item = dict(embarcacao)
        api_item['origem'] = 'api'
        resource_key = str(api_item.get('id') or api_item.get('resource_id') or '')
        local_info = locais_por_resource.get(resource_key)
        if local_info:
            api_item['progresso'] = local_info.get('progresso', 100)
            api_item['mensagem_status'] = local_info.get('mensagem_status', '')
            api_item['status_local'] = local_info.get('status_local', '')
            api_item['job_id'] = local_info.get('job_id')
            api_item['resultado_api'] = local_info.get('resultado_api') or api_item.get('resultado_api')
        else:
            api_item.setdefault('progresso', 100 if api_item.get('classificacao') else 0)
            api_item.setdefault('mensagem_status', '')
            api_item.setdefault('status_local', 'Analisada' if api_item.get('classificacao') else '')
        embarcacoes_api_enriquecidas.append(api_item)

    embarcacoes = uploads_locais + embarcacoes_api_enriquecidas
    
    # Ordenar por data de cadastro (mais recentes primeiro)
    embarcacoes = sorted(embarcacoes, key=lambda x: x.get('data_cadastro', ''), reverse=True)
    
    # Aplicar filtros
    if filtro_tipo:
        embarcacoes = [e for e in embarcacoes if e.get('classificacao', '').lower() == filtro_tipo]
    
    if filtro_regiao:
        embarcacoes = [e for e in embarcacoes if e.get('regiao') and e.get('regiao').lower() == filtro_regiao.lower()]
    
    if filtro_busca:
        def match_busca(embarcacao):
            # Buscar em múltiplos campos
            localidade = str(embarcacao.get('localidade', '')).lower()
            titulo = str(embarcacao.get('titulo', '')).lower()
            descricao = str(embarcacao.get('descricao', '')).lower()
            id_str = str(embarcacao.get('id', '')).lower()
            
            return (filtro_busca in localidade or 
                   filtro_busca in titulo or 
                   filtro_busca in descricao or 
                   filtro_busca in id_str)
        
        embarcacoes = [e for e in embarcacoes if match_busca(e)]
    
    # Implementar paginação
    paginator = Paginator(embarcacoes, page_size)
    page_obj = paginator.get_page(page)
    
    # Calcular estatísticas totais
    total_legais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'legal'])
    total_ilegais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'ilegal'])
    
    # Preparar dados para resposta
    response_data = {
        'embarcacoes': page_obj.object_list,
        'total_count': len(embarcacoes),
        'total_legais': total_legais,
        'total_ilegais': total_ilegais,
        'page': page,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'has_previous': page_obj.has_previous(),
        'has_next': page_obj.has_next(),
        'previous_page': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
        'start_index': page_obj.start_index(),
        'end_index': page_obj.end_index(),
        'load_time': round(time.time() - start_time, 2)
    }
    
    # Cachear por 5 minutos
    cache.set(cache_key, response_data, 300)
    
    # Depois de gerar os dados (cache miss)
    response = JsonResponse(response_data)
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


def exportar_csv(request):
    """View para exportar dados em CSV"""
    from django.http import HttpResponse
    import csv
    
    # Buscar dados da API externa
    dados_api = api_client.get_dados_embarcacoes()
    
    if not dados_api or 'embarcacoes' not in dados_api:
        return JsonResponse({'error': 'Nenhum dado disponível para exportar'})
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="embarcacoes_aritana.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['ID', 'Nome', 'Tipo', 'Região', 'Latitude', 'Longitude', 'Data Registro'])
    
    for embarcacao in dados_api['embarcacoes']:
        writer.writerow([
            embarcacao.get('id', ''),
            embarcacao.get('nome', ''),
            embarcacao.get('tipo', ''),
            embarcacao.get('regiao', ''),
            embarcacao.get('latitude', ''),
            embarcacao.get('longitude', ''),
            embarcacao.get('data_registro', '')
        ])
    
    return response
