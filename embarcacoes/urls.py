from django.urls import path
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    # Rota principal redireciona para dashboard
    path('', RedirectView.as_view(pattern_name='dashboard', permanent=False), name='home'),
    
    # Views principais
    path('dashboard/', views.dashboard, name='dashboard'),
    path('historico/', views.historico, name='historico'),
    path('upload/', views.upload_imagem, name='upload_imagem'),
    path('upload-page/', views.upload_imagem, name='upload_page'),
    path('upload-grande/', views.upload_teste_grande, name='upload_teste_grande'),
    
    # APIs JSON
    path('api/mapa/', views.dados_mapa_json, name='dados_mapa_json'),
    path('api/graficos/', views.dados_graficos_json, name='dados_graficos_json'),
    path('api/cache/', views.dados_cache_json, name='dados_cache_json'),
    path('api/historico/', views.historico_ajax, name='historico_ajax'),
    path('api/exportar/', views.exportar_csv, name='exportar_csv'),
    
    # APIs para processamento assíncrono
    path('api/jobs/<str:job_id>/status/', views.verificar_status_job, name='verificar_status_job'),
    path('api/jobs/', views.listar_jobs_processamento, name='listar_jobs_processamento'),
    path('api/resultado/<int:resource_id>/', views.obter_resultado_processamento, name='obter_resultado_processamento'),
]
