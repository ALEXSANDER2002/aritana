"""
URLs da API para o app embarcacoes.
"""
from django.urls import path
from . import views

app_name = 'embarcacoes_api'

urlpatterns = [
    # API endpoints
    path('upload-embarcacao/', views.upload_embarcacao, name='upload_embarcacao'),
    path('estatisticas/', views.estatisticas_gerais, name='estatisticas'),
    path('estatisticas-dashboard/', views.estatisticas_api, name='estatisticas_dashboard'),
    path('mapa/', views.analises_mapa, name='analises_mapa'),
] 