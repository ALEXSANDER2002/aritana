"""
Admin interface para o sistema ARITANA de monitoramento de embarcações.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import AnaliseEmbarcacao, EstatisticasRegiao


@admin.register(AnaliseEmbarcacao)
class AnaliseEmbarcacaoAdmin(admin.ModelAdmin):
    """
    Interface administrativa para análises de embarcações.
    """
    list_display = [
        'id', 
        'nome_arquivo_truncado', 
        'status_badge', 
        'probabilidade_formatada',
        'coordenadas_formatadas',
        'data_analise',
        'tempo_processamento_formatado',
        'thumbnail'
    ]
    
    list_filter = [
        'status',
        'data_analise',
        'modelo_ia_utilizado',
    ]
    
    search_fields = [
        'nome_arquivo',
        'latitude',
        'longitude'
    ]
    
    readonly_fields = [
        'id',
        'data_analise',
        'data_atualizacao',
        'thumbnail_detalhado',
        'coordenadas_mapa'
    ]
    
    fieldsets = (
        ('Informações da Imagem', {
            'fields': ('imagem', 'nome_arquivo', 'thumbnail_detalhado')
        }),
        ('Resultados da Análise', {
            'fields': ('status', 'probabilidade', 'modelo_ia_utilizado', 'tempo_processamento')
        }),
        ('Localização', {
            'fields': ('latitude', 'longitude', 'coordenadas_mapa')
        }),
        ('Metadados', {
            'fields': ('data_analise', 'data_atualizacao'),
            'classes': ('collapse',)
        })
    )
    
    ordering = ['-data_analise']
    list_per_page = 25
    date_hierarchy = 'data_analise'
    
    def nome_arquivo_truncado(self, obj):
        """Exibe nome do arquivo truncado."""
        if len(obj.nome_arquivo) > 30:
            return obj.nome_arquivo[:27] + '...'
        return obj.nome_arquivo
    nome_arquivo_truncado.short_description = 'Arquivo'
    
    def status_badge(self, obj):
        """Exibe status como badge colorido."""
        colors = {
            'legal': '#10b981',
            'ilegal': '#ef4444',
            'em_analise': '#f59e0b'
        }
        color = colors.get(obj.status, '#6b7280')
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def probabilidade_formatada(self, obj):
        """Exibe probabilidade com formatação."""
        if obj.probabilidade >= 90:
            color = '#10b981'  # Verde
        elif obj.probabilidade >= 70:
            color = '#f59e0b'  # Amarelo
        else:
            color = '#ef4444'  # Vermelho
            
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            obj.probabilidade
        )
    probabilidade_formatada.short_description = 'Probabilidade'
    
    def coordenadas_formatadas(self, obj):
        """Exibe coordenadas formatadas."""
        return format_html(
            '<span style="font-family: monospace; font-size: 11px;">'
            'Lat: {:.4f}<br/>Lon: {:.4f}</span>',
            obj.latitude,
            obj.longitude
        )
    coordenadas_formatadas.short_description = 'Coordenadas'
    
    def tempo_processamento_formatado(self, obj):
        """Exibe tempo de processamento formatado."""
        if not obj.tempo_processamento:
            return '-'
        
        tempo = obj.tempo_processamento
        if tempo < 1:
            return f'{tempo*1000:.0f}ms'
        elif tempo < 60:
            return f'{tempo:.1f}s'
        else:
            return f'{tempo/60:.1f}min'
    tempo_processamento_formatado.short_description = 'Tempo Proc.'
    
    def thumbnail(self, obj):
        """Exibe thumbnail da imagem."""
        if obj.imagem:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; '
                'object-fit: cover; border-radius: 4px;" />',
                obj.imagem.url
            )
        return '-'
    thumbnail.short_description = 'Imagem'
    
    def thumbnail_detalhado(self, obj):
        """Exibe thumbnail maior para visualização detalhada."""
        if obj.imagem:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px; '
                'object-fit: contain; border: 1px solid #ddd; border-radius: 4px;" />',
                obj.imagem.url
            )
        return 'Nenhuma imagem'
    thumbnail_detalhado.short_description = 'Preview da Imagem'
    
    def coordenadas_mapa(self, obj):
        """Exibe link para ver no mapa."""
        google_maps_url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
        return format_html(
            '<a href="{}" target="_blank" style="color: #3b82f6;">Ver no Google Maps</a><br/>'
            '<small style="color: #6b7280;">Lat: {:.6f}, Lon: {:.6f}</small>',
            google_maps_url,
            obj.latitude,
            obj.longitude
        )
    coordenadas_mapa.short_description = 'Localização'
    
    def get_queryset(self, request):
        """Otimiza queries do admin."""
        return super().get_queryset(request).select_related()
    
    actions = ['marcar_como_legal', 'marcar_como_ilegal', 'exportar_csv']
    
    def marcar_como_legal(self, request, queryset):
        """Ação para marcar análises como legais."""
        count = queryset.update(status='legal')
        self.message_user(
            request,
            f'{count} análise(s) marcada(s) como legal(is).'
        )
    marcar_como_legal.short_description = 'Marcar como Legal'
    
    def marcar_como_ilegal(self, request, queryset):
        """Ação para marcar análises como ilegais."""
        count = queryset.update(status='ilegal')
        self.message_user(
            request,
            f'{count} análise(s) marcada(s) como ilegal(is).'
        )
    marcar_como_ilegal.short_description = 'Marcar como Ilegal'
    
    def exportar_csv(self, request, queryset):
        """Ação para exportar dados para CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="analises_embarcacoes.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Nome Arquivo', 'Status', 'Probabilidade', 
            'Latitude', 'Longitude', 'Data Análise', 'Tempo Processamento'
        ])
        
        for obj in queryset:
            writer.writerow([
                obj.id,
                obj.nome_arquivo,
                obj.get_status_display(),
                obj.probabilidade,
                obj.latitude,
                obj.longitude,
                obj.data_analise.strftime('%Y-%m-%d %H:%M:%S'),
                obj.tempo_processamento or ''
            ])
        
        return response
    exportar_csv.short_description = 'Exportar para CSV'


@admin.register(EstatisticasRegiao)
class EstatisticasRegiaoAdmin(admin.ModelAdmin):
    """
    Interface administrativa para estatísticas por região.
    """
    list_display = [
        'nome_regiao',
        'total_embarcacoes',
        'embarcacoes_legais',
        'embarcacoes_ilegais',
        'taxa_legalidade_formatada',
        'ultima_atualizacao'
    ]
    
    list_filter = [
        'ultima_atualizacao',
    ]
    
    search_fields = ['nome_regiao']
    
    readonly_fields = [
        'ultima_atualizacao',
        'taxa_legalidade_formatada',
        'mapa_regiao'
    ]
    
    fieldsets = (
        ('Informações da Região', {
            'fields': ('nome_regiao', 'mapa_regiao')
        }),
        ('Coordenadas da Região', {
            'fields': ('lat_min', 'lat_max', 'lon_min', 'lon_max'),
            'classes': ('collapse',)
        }),
        ('Estatísticas', {
            'fields': (
                'total_embarcacoes', 
                'embarcacoes_legais', 
                'embarcacoes_ilegais',
                'taxa_legalidade_formatada'
            )
        }),
        ('Metadados', {
            'fields': ('ultima_atualizacao',),
            'classes': ('collapse',)
        })
    )
    
    def taxa_legalidade_formatada(self, obj):
        """Exibe taxa de legalidade formatada."""
        taxa = obj.taxa_legalidade
        
        if taxa >= 80:
            color = '#10b981'  # Verde
        elif taxa >= 60:
            color = '#f59e0b'  # Amarelo
        else:
            color = '#ef4444'  # Vermelho
            
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            taxa
        )
    taxa_legalidade_formatada.short_description = 'Taxa de Legalidade'
    
    def mapa_regiao(self, obj):
        """Exibe link para ver a região no mapa."""
        # Calcular centro da região
        lat_centro = (obj.lat_min + obj.lat_max) / 2
        lon_centro = (obj.lon_min + obj.lon_max) / 2
        
        google_maps_url = f"https://www.google.com/maps?q={lat_centro},{lon_centro}"
        
        return format_html(
            '<a href="{}" target="_blank" style="color: #3b82f6;">Ver Região no Mapa</a><br/>'
            '<small style="color: #6b7280;">Centro: {:.4f}, {:.4f}</small>',
            google_maps_url,
            lat_centro,
            lon_centro
        )
    mapa_regiao.short_description = 'Localização da Região'


# Customizar o header do admin
admin.site.site_header = "ARITANA - Administração"
admin.site.site_title = "ARITANA Admin"
admin.site.index_title = "Sistema de Monitoramento de Embarcações" 