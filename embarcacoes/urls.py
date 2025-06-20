"""
URLs para o app embarcacoes.
"""
from django.urls import path
from . import views

app_name = 'embarcacoes'

urlpatterns = [
    # View principal do dashboard
    path('', views.DashboardView.as_view(), name='dashboard'),
] 