"""
Configuração do app embarcacoes para o sistema ARITANA.
"""
from django.apps import AppConfig


class EmbarcacoesConfig(AppConfig):
    """
    Configuração do app de monitoramento de embarcações.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'embarcacoes'
    verbose_name = 'Monitoramento de Embarcações'
    
    def ready(self):
        """
        Código executado quando o app estiver pronto.
        """
        # Importar signals se houver
        try:
            from . import signals
        except ImportError:
            pass 