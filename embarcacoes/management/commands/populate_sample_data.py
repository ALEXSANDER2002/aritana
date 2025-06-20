from django.core.management.base import BaseCommand
from embarcacoes.models import AnaliseEmbarcacao
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Popula o banco de dados com dados de exemplo para demonstração'

    def handle(self, *args, **options):
        # Criar dados de exemplo para análises de embarcações
        samples = [
            {
                'latitude': -1.4558,
                'longitude': -48.5034,
                'status': 'legal',
                'probabilidade': 95.5,
                'detalhes': {
                    'tipo_embarcacao': 'Pesqueiro',
                    'tamanho_estimado': '12m',
                    'cor_predominante': 'Azul',
                    'numero_pessoas': 3
                }
            },
            {
                'latitude': -1.4420,
                'longitude': -48.4900,
                'status': 'irregular',
                'probabilidade': 87.2,
                'detalhes': {
                    'tipo_embarcacao': 'Canoa',
                    'tamanho_estimado': '8m',
                    'cor_predominante': 'Branca',
                    'numero_pessoas': 2
                }
            },
            {
                'latitude': -1.4680,
                'longitude': -48.5200,
                'status': 'legal',
                'probabilidade': 92.1,
                'detalhes': {
                    'tipo_embarcacao': 'Lancha',
                    'tamanho_estimado': '15m',
                    'cor_predominante': 'Vermelha',
                    'numero_pessoas': 5
                }
            },
            {
                'latitude': -1.4300,
                'longitude': -48.4800,
                'status': 'irregular',
                'probabilidade': 78.9,
                'detalhes': {
                    'tipo_embarcacao': 'Barco de pesca',
                    'tamanho_estimado': '20m',
                    'cor_predominante': 'Verde',
                    'numero_pessoas': 8
                }
            },
            {
                'latitude': -1.4750,
                'longitude': -48.5350,
                'status': 'legal',
                'probabilidade': 96.8,
                'detalhes': {
                    'tipo_embarcacao': 'Balsa',
                    'tamanho_estimado': '25m',
                    'cor_predominante': 'Cinza',
                    'numero_pessoas': 12
                }
            }
        ]

        # Limpar dados existentes
        AnaliseEmbarcacao.objects.all().delete()

        for i, sample in enumerate(samples):
            data_analise = datetime.now() - timedelta(days=random.randint(0, 30))
            
            # Criar sem imagem por enquanto (apenas para demonstração)
            analise = AnaliseEmbarcacao(
                nome_arquivo=f'sample_{i+1}.jpg',
                latitude=sample['latitude'],
                longitude=sample['longitude'],
                status=sample['status'],
                probabilidade=sample['probabilidade'],
                tempo_processamento=random.uniform(2.5, 8.9),
                modelo_ia_utilizado='YOLOv8n-maritime'
            )
            # Definir data_analise manualmente já que não há auto_now_add
            analise.data_analise = data_analise
            analise.save()

        self.stdout.write(
            self.style.SUCCESS(f'✅ {len(samples)} análises de exemplo criadas com sucesso!')
        ) 