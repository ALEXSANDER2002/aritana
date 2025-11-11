from django.contrib import admin
from .models import Embarcacao, ImagemEmbarcacao, AnaliseRegional


@admin.register(Embarcacao)
class EmbarcacaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo', 'latitude', 'longitude', 'data_registro', 'ativa']
    list_filter = ['tipo', 'ativa', 'data_registro']
    search_fields = ['nome', 'descricao']
    list_editable = ['ativa']
    readonly_fields = ['data_registro']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'tipo', 'descricao', 'ativa')
        }),
        ('Localização', {
            'fields': ('latitude', 'longitude')
        }),
        ('Dados do Sistema', {
            'fields': ('data_registro',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ImagemEmbarcacao)
class ImagemEmbarcacaoAdmin(admin.ModelAdmin):
    list_display = ['embarcacao', 'titulo', 'status_analise', 'data_upload']
    list_filter = ['status_analise', 'data_upload']
    search_fields = ['titulo', 'embarcacao__nome']
    readonly_fields = ['data_upload']
    
    fieldsets = (
        ('Informações da Imagem', {
            'fields': ('embarcacao', 'imagem', 'titulo', 'descricao')
        }),
        ('Análise', {
            'fields': ('status_analise',)
        }),
        ('Dados do Sistema', {
            'fields': ('data_upload',),
            'classes': ('collapse',)
        }),
    )


@admin.register(AnaliseRegional)
class AnaliseRegionalAdmin(admin.ModelAdmin):
    list_display = ['regiao', 'mes', 'embarcacoes_legais', 'embarcacoes_ilegais', 'total_fiscalizacoes', 'percentual_legal']
    list_filter = ['regiao', 'mes']
    search_fields = ['regiao']
    readonly_fields = ['data_criacao', 'total_embarcacoes', 'percentual_legal']
    
    fieldsets = (
        ('Informações da Análise', {
            'fields': ('regiao', 'mes')
        }),
        ('Dados Estatísticos', {
            'fields': ('embarcacoes_legais', 'embarcacoes_ilegais', 'total_fiscalizacoes')
        }),
        ('Informações Calculadas', {
            'fields': ('total_embarcacoes', 'percentual_legal'),
            'classes': ('collapse',)
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Dados do Sistema', {
            'fields': ('data_criacao',),
            'classes': ('collapse',)
        }),
    )
    
    def percentual_legal(self, obj):
        return f"{obj.percentual_legal:.1f}%"
    percentual_legal.short_description = "% Legal"