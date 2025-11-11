# Use Python 3.11 slim para uma imagem menor
FROM python:3.11-slim

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema necessárias para Pillow
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia o arquivo de requisitos
COPY requirements.txt .

# Instala as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código da aplicação
COPY . .

# Cria os diretórios necessários
RUN mkdir -p logs media staticfiles

# Coleta os arquivos estáticos
RUN python manage.py collectstatic --noinput

# Expõe a porta 8000
EXPOSE 8000

# Script de inicialização que executa migrações e inicia o servidor
CMD python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000

