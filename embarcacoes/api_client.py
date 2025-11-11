"""
Cliente para integração com API externa do sistema ARITANA
Este arquivo gerencia toda comunicação com a API externa e a nova API FastAPI de processamento de imagens
"""
import requests
import json
import logging
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import time

logger = logging.getLogger(__name__)


class AritanaAPIClient:
    """
    Cliente para comunicação com a API externa do ARITANA
    
    Este classe centraliza todas as chamadas para a API externa,
    facilitando manutenção e debug.
    """
    
    def __init__(self):
        self.base_url = settings.ARITANA_API_URL
        self.headers = {
            "Authorization": f"Bearer {settings.ARITANA_API_KEY}",
            "Content-Type": "application/json"
        }
        self.timeout = 5  # Reduzido para 5 segundos
        self.max_retries = 2
        logger.info(f"Cliente API inicializado - URL: {self.base_url}")
    
    def _make_request(self, url, retries=0, method='GET', **kwargs):
        """Faz requisição com retry automático"""
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, timeout=self.timeout, **kwargs)
            else:
                response = requests.request(method, url, headers=self.headers, timeout=self.timeout, **kwargs)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            if retries < self.max_retries:
                logger.warning(f"Timeout na requisição, tentando novamente ({retries + 1}/{self.max_retries})")
                time.sleep(1)  # Aguarda 1 segundo antes de tentar novamente
                return self._make_request(url, retries + 1, method, **kwargs)
            else:
                logger.error(f"Timeout após {self.max_retries} tentativas")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição: {str(e)}")
            return None

    def get_dados_embarcacoes(self):
        """
        Busca dados das embarcações da API externa com cache
        
        Returns:
            dict: Dados das embarcações ou None se erro
        """
        # Verificar cache primeiro
        cache_key = 'dados_embarcacoes'
        dados_cache = cache.get(cache_key)
        if dados_cache:
            logger.info("Retornando dados do cache")
            return dados_cache
        
        endpoint = '/embarcacoes'
        todas_embarcacoes = []
        
        try:
            # Buscar primeira página (limit=100)
            logger.info(f"Buscando dados de embarcações: {endpoint}")
            dados_pagina1 = self._make_request(f"{self.base_url}{endpoint}?limit=100")
            
            if dados_pagina1 is None:
                return None
                
            todas_embarcacoes.extend(dados_pagina1)
            logger.info(f"Primeira página: {len(dados_pagina1)} embarcações")
            
            # Buscar segunda página se necessário
            if len(dados_pagina1) == 100:
                dados_pagina2 = self._make_request(f"{self.base_url}{endpoint}?skip=100&limit=100")
                if dados_pagina2:
                    todas_embarcacoes.extend(dados_pagina2)
                    logger.info(f"Segunda página: {len(dados_pagina2)} embarcações")
            
            # Retornar no formato esperado
            dados = {'embarcacoes': todas_embarcacoes}
            
            # Cachear por 10 minutos (aumentado para melhor performance)
            cache.set(cache_key, dados, 600)
            logger.info(f"Total de embarcações carregadas: {len(todas_embarcacoes)}")
            return dados
            
        except Exception as e:
            logger.error(f"Erro ao buscar dados de embarcações: {str(e)}")
            return None
    
    def enviar_imagem_para_analise(self, imagem_data, titulo=None, descricao=None, regiao=None, localidade=None, latitude=None, longitude=None, data_foto=None):
        """Envia imagem para análise na API FastAPI com YOLO"""
        # URL da nova API FastAPI de processamento de imagens
        fastapi_url = getattr(settings, 'FASTAPI_YOLO_URL', 'https://backend-segura-production.up.railway.app')
        endpoint = '/embarcacoes'
        
        try:
            # Preparar dados do formulário
            files = {'file': imagem_data}  # A API FastAPI espera 'file' como campo
            
            # SEMPRE enviar TODOS os campos (igual ao curl que funciona)
            # A API YOLO precisa de todos os campos preenchidos
            data = {
                'regiao': regiao or 'Norte',
                'localidade': localidade or regiao or 'Belém',
                'latitude': str(latitude) if latitude else '-1.4558',
                'longitude': str(longitude) if longitude else '-48.5044',
                'data_foto': data_foto or '',
                'titulo': titulo or '',
                'descricao': descricao or '',
            }
            
            logger.info(f"Dados para API YOLO: {data}")
            
            headers = {"Authorization": f"Bearer {settings.ARITANA_API_KEY}"}
            
            response = requests.post(
                f"{fastapi_url}{endpoint}",
                files=files,
                data=data,
                headers=headers,
                timeout=180  # 3 minutos para imagens grandes (até 20MB)
            )
            response.raise_for_status()
            
            resultado = response.json()
            logger.info(f"Resposta da API: {resultado}")
            
            # A API pode retornar 'id' ou 'job_id' - normalizar
            if 'id' in resultado and 'job_id' not in resultado:
                resultado['job_id'] = str(resultado['id'])
                logger.info(f"Convertendo 'id' para 'job_id': {resultado['job_id']}")
            
            # Invalidar cache após nova análise
            cache.delete('dados_embarcacoes')
            cache.delete('estatisticas_regionais')
            
            logger.info(f"Imagem enviada para processamento. Job ID: {resultado.get('job_id')}")
            return resultado
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao enviar imagem para análise: {e}")
            return None
    
    def verificar_status_job(self, job_id, status_url=None):
        """Verifica o status de um job de processamento usando URL da API"""
        try:
            headers = {"Authorization": f"Bearer {settings.ARITANA_API_KEY}"}
            
            # Usar status_url se fornecido, senão construir manualmente
            if status_url:
                # Corrigir http:// para https:// (a API retorna http mas deveria ser https)
                url = status_url.replace('http://', 'https://')
                logger.info(f"Usando status_url da API (corrigido para HTTPS): {url}")
            else:
                fastapi_url = getattr(settings, 'FASTAPI_YOLO_URL', 'https://backend-segura-production.up.railway.app')
                url = f"{fastapi_url}/jobs/{job_id}"
                logger.info(f"Construindo URL manualmente: {url}")
            
            response = requests.get(
                url,
                headers=headers,
                timeout=15
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao verificar status do job {job_id}: {e}")
            return None
    
    def obter_resultado_processamento(self, resource_id):
        """Obtém o resultado final do processamento"""
        fastapi_url = getattr(settings, 'FASTAPI_YOLO_URL', 'https://backend-segura-production.up.railway.app')
        endpoint = f'/embarcacoes?id={resource_id}'
        
        try:
            headers = {"Authorization": f"Bearer {settings.ARITANA_API_KEY}"}
            
            response = requests.get(
                f"{fastapi_url}{endpoint}",
                headers=headers,
                timeout=15
            )
            response.raise_for_status()
            
            resultado = response.json()
            logger.info(f"Resultado do processamento (ID {resource_id}): {resultado}")
            
            # A API retorna sempre uma lista - pegar primeiro item
            if isinstance(resultado, list):
                if len(resultado) > 0:
                    return resultado[0]
                else:
                    logger.warning(f"API retornou lista vazia para resource_id={resource_id}")
                    return None
            
            # Se retornou objeto único, retornar diretamente
            return resultado
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao obter resultado do processamento {resource_id}: {e}")
            return None
    
    def verificar_saude_api(self):
        """
        Verifica se a API FastAPI está disponível através do endpoint /ping
        
        Returns:
            bool: True se a API está online e respondendo, False caso contrário
        """
        fastapi_url = getattr(settings, 'FASTAPI_YOLO_URL', 'https://backend-segura-production.up.railway.app')
        endpoint = '/ping'
        
        try:
            response = requests.get(
                f"{fastapi_url}{endpoint}",
                timeout=5  # Timeout curto para health check
            )
            
            # Verificar se retornou 200 e a mensagem esperada
            if response.status_code == 200:
                data = response.json()
                is_healthy = data.get('message') == 'pong'
                
                if is_healthy:
                    logger.info("[OK] API FastAPI esta online e saudavel")
                else:
                    logger.warning("[AVISO] API FastAPI respondeu mas com mensagem inesperada")
                
                return is_healthy
            else:
                logger.warning(f"[AVISO] API FastAPI retornou status {response.status_code}")
                return False
            
        except requests.exceptions.Timeout:
            logger.error("[ERRO] Timeout ao verificar saude da API FastAPI")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"[ERRO] Erro ao verificar saude da API FastAPI: {e}")
            return False
    
    def get_estatisticas_regionais(self):
        """Busca estatísticas regionais da API externa com cache"""
        # Verificar cache primeiro
        cache_key = 'estatisticas_regionais'
        estatisticas_cache = cache.get(cache_key)
        if estatisticas_cache:
            logger.info("Retornando estatísticas do cache")
            return estatisticas_cache
        
        # Como a API não tem endpoint específico para estatísticas,
        # vamos calcular com base nos dados das embarcações
        dados_embarcacoes = self.get_dados_embarcacoes()
        
        if not dados_embarcacoes or 'embarcacoes' not in dados_embarcacoes:
            return None
        
        embarcacoes = dados_embarcacoes['embarcacoes']
        
        # Calcular estatísticas (API usa 'classificacao' com 'c')
        legais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'legal'])
        ilegais = len([e for e in embarcacoes if e.get('classificacao', '').lower() == 'ilegal'])
        
        # Agrupar por região
        regioes = {}
        for embarcacao in embarcacoes:
            regiao = embarcacao.get('regiao', 'Desconhecida')
            if regiao not in regioes:
                regioes[regiao] = {'legais': 0, 'ilegais': 0}
            
            classificacao = embarcacao.get('classificacao', '').lower()
            if classificacao == 'legal':
                regioes[regiao]['legais'] += 1
            elif classificacao == 'ilegal':
                regioes[regiao]['ilegais'] += 1
        
        # Formatar para compatibilidade com gráficos
        estatisticas = {
            'legalidade': {
                'legais': legais,
                'ilegais': ilegais
            },
            'regional': {
                'meses': list(regioes.keys()),
                'legais': [regioes[r]['legais'] for r in regioes.keys()],
                'ilegais': [regioes[r]['ilegais'] for r in regioes.keys()]
            }
        }
        
        # Cachear por 5 minutos
        cache.set(cache_key, estatisticas, 300)
        logger.info(f"Estatísticas calculadas: {estatisticas}")
        return estatisticas


# Instância global do cliente
api_client = AritanaAPIClient()
