"""
SCRIPT DE UPLOAD PARA IMAGENS GRANDES
======================================

USO:
    python upload_imagem_grande.py

Esse script permite fazer upload de imagens grandes (até 20MB)
que podem dar problema no navegador.
"""

import requests
import time
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# ========== CONFIGURAÇÕES ==========
# Modifique aqui para cada upload:

IMAGEM_PATH = r"C:\Users\Alexsander\Music\aritanaa\DJI_0416.JPG"
TITULO = "Drone - Baía do Guajará"
DESCRICAO = "Imagem aérea de embarcação"
REGIAO = "Baía do Guajará"  # Opções: Centro, Norte, Sul, Baía do Guajará, etc.

# ===================================

print("=" * 70)
print("🚀 UPLOAD DE IMAGEM GRANDE - ARITANA")
print("=" * 70)

# Validar arquivo
if not os.path.exists(IMAGEM_PATH):
    print(f"\n❌ Arquivo não encontrado: {IMAGEM_PATH}")
    print(f"\n💡 Edite a linha 15 do script com o caminho correto.")
    sys.exit(1)

tamanho_mb = os.path.getsize(IMAGEM_PATH) / 1024 / 1024
nome_arquivo = os.path.basename(IMAGEM_PATH)

print(f"\n📸 Arquivo: {nome_arquivo}")
print(f"   Tamanho: {tamanho_mb:.2f} MB")

if tamanho_mb > 20:
    print(f"\n❌ Arquivo excede 20MB!")
    print(f"\n💡 Reduza o tamanho da imagem antes do upload.")
    sys.exit(1)

# CSRF token
print(f"\n1️⃣  Conectando ao servidor...")
session = requests.Session()
response = session.get("http://localhost:8000/upload/")
csrf_token = session.cookies.get('csrftoken')

if not csrf_token:
    print(f"   ❌ Não conseguiu obter CSRF token")
    print(f"   Verifique se o servidor está rodando: http://localhost:8000")
    sys.exit(1)

print(f"   ✅ Conectado")

# Upload
print(f"\n2️⃣  Enviando imagem (isso pode demorar 1-2 minutos)...")
print(f"   📝 Título: {TITULO}")
print(f"   📍 Região: {REGIAO}")

try:
    with open(IMAGEM_PATH, 'rb') as f:
        files = {'imagem': (nome_arquivo, f, 'image/jpeg')}
        data = {
            'titulo': TITULO,
            'descricao': DESCRICAO,
            'regiao': REGIAO,
            'csrfmiddlewaretoken': csrf_token
        }
        
        response = session.post(
            "http://localhost:8000/upload/",
            files=files,
            data=data,
            allow_redirects=False,
            headers={'Referer': 'http://localhost:8000/upload/'},
            timeout=180
        )
    
    if response.status_code == 302:
        print(f"\n   ✅ UPLOAD CONCLUÍDO!")
        
        time.sleep(2)
        
        # Verificar job
        resp = session.get("http://localhost:8000/api/jobs/")
        jobs = resp.json().get('jobs', [])
        
        if jobs:
            job_id = jobs[0].get('job_id')
            
            print(f"\n{'='*70}")
            print(f"🎉 SUCESSO!")
            print(f"{'='*70}")
            print(f"\n✅ Imagem enviada para processamento")
            print(f"📊 Job ID: {job_id}")
            print(f"\n📍 Acompanhe em:")
            print(f"   http://localhost:8000/historico/")
            print(f"\n⏳ O processamento levará 1-2 minutos.")
            print(f"   A página atualiza automaticamente.")
            print(f"{'='*70}")
        else:
            print(f"\n✅ Upload aceito! Veja no histórico.")
            
    else:
        print(f"\n❌ Erro: HTTP {response.status_code}")
        
except requests.exceptions.Timeout:
    print(f"\n❌ TIMEOUT! Arquivo muito grande.")
    print(f"\n💡 Tente reduzir o tamanho da imagem.")
    
except Exception as e:
    print(f"\n❌ Erro: {e}")

print("\n" + "=" * 70)

