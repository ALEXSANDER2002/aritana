from django.shortcuts import render
from django.contrib import messages
from .models import Embarcacao, ImagemEmbarcacao, TipoEmbarcacao, StatusAnalise
from .api_client import api_client
import logging

logger = logging.getLogger(__name__)


def upload_imagem(request):
    """View para upload de imagens com processamento assíncrono"""
    if request.method == 'POST':
        imagem = request.FILES.get('imagem')
        titulo = request.POST.get('titulo', '')
        descricao = request.POST.get('descricao', '')
        regiao = request.POST.get('regiao', '')
        
        # Se não especificou localidade, usar a própria região como localidade
        localidade = request.POST.get('localidade', '')
        if not localidade and regiao:
            localidade = regiao  # Ex: "Centro" será tanto região quanto localidade
        
        # Obter coordenadas opcionais
        latitude = request.POST.get('latitude')
        longitude = request.POST.get('longitude')
        
        # Converter coordenadas para float se fornecidas
        try:
            latitude = float(latitude) if latitude else None
        except (ValueError, TypeError):
            latitude = None
        
        try:
            longitude = float(longitude) if longitude else None
        except (ValueError, TypeError):
            longitude = None
        
        if imagem:
            try:
                # Criar ou obter embarcação padrão
                embarcacao_padrao, created = Embarcacao.objects.get_or_create(
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
                
                # Criar registro da imagem no banco local
                imagem_obj = ImagemEmbarcacao.objects.create(
                    embarcacao=embarcacao_padrao,
                    imagem=imagem,
                    titulo=titulo,
                    descricao=descricao,
                    status_analise=StatusAnalise.PENDENTE
                )
                
                # Enviar para processamento na API FastAPI com todos os dados
                resultado = api_client.enviar_imagem_para_analise(
                    imagem, 
                    titulo=titulo,
                    descricao=descricao,
                    regiao=regiao,
                    localidade=localidade,
                    latitude=latitude,
                    longitude=longitude
                )
                
                if resultado and 'job_id' in resultado:
                    # Iniciar processamento assíncrono
                    imagem_obj.iniciar_processamento(resultado['job_id'])
                    messages.success(
                        request, 
                        f'Imagem enviada com sucesso! Job ID: {resultado["job_id"]}. '
                        'Acompanhe o progresso na página de histórico.'
                    )
                    # Redirecionar para a mesma página para mostrar o feedback
                    return render(request, 'embarcacoes/upload_imagem.html', {
                        'job_id': resultado['job_id'],
                        'success_message': f'Imagem enviada com sucesso! Job ID: {resultado["job_id"]}'
                    })
                else:
                    imagem_obj.marcar_erro_processamento('Erro ao iniciar processamento')
                    messages.error(request, 'Erro ao enviar imagem para análise. Tente novamente.')
                    
            except Exception as e:
                logger.error(f"Erro no upload da imagem: {str(e)}")
                messages.error(request, f'Erro interno: {str(e)}')
        else:
            messages.error(request, 'Nenhuma imagem foi selecionada.')
    
    # Se GET ou se houve erro, mostrar página de upload
    return render(request, 'embarcacoes/upload_imagem.html')


