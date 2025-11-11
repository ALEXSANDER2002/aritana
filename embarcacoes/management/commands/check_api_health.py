"""
Comando Django para verificar a saúde da API FastAPI YOLO
Útil para monitoramento e cron jobs
"""
from django.core.management.base import BaseCommand
from embarcacoes.api_client import api_client
import sys


class Command(BaseCommand):
    help = 'Verifica se a API FastAPI YOLO está online e saudável'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Exibe informações detalhadas',
        )
        parser.add_argument(
            '--exit-code',
            action='store_true',
            help='Retorna exit code 0 se online, 1 se offline (útil para scripts)',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        use_exit_code = options['exit_code']
        
        if verbose:
            self.stdout.write('Verificando saúde da API FastAPI YOLO...')
        
        is_healthy = api_client.verificar_saude_api()
        
        if is_healthy:
            self.stdout.write(
                self.style.SUCCESS('[OK] API FastAPI esta online e saudavel')
            )
            
            if verbose:
                self.stdout.write('  - Endpoint: /ping')
                self.stdout.write('  - Status: 200 OK')
                self.stdout.write('  - Resposta: {"message": "pong"}')
            
            if use_exit_code:
                sys.exit(0)
        else:
            self.stdout.write(
                self.style.ERROR('[ERRO] API FastAPI esta offline ou inacessivel')
            )
            
            if verbose:
                self.stdout.write('  - Verifique se a URL esta correta')
                self.stdout.write('  - Verifique a conectividade de rede')
                self.stdout.write('  - Consulte os logs para mais detalhes')
            
            if use_exit_code:
                sys.exit(1)

