# 🚢 ARITANA - Sistema de Identificação e Monitoramento de Embarcações

Sistema de visão computacional desenvolvido em Django para análise de fotos de embarcações, determinação de legalidade e plotagem de localização em mapa interativo para a região do estuário do rio Pará.

## 📋 Características Principais

- **Upload Assíncrono**: Envio de imagens via drag-and-drop ou clique
- **Análise por IA**: Processamento automatizado usando modelos de visão computacional
- **Mapa Interativo**: Visualização de localizações usando Leaflet.js
- **Dashboard Responsivo**: Interface moderna com Tailwind CSS e componentes Shadcn-like
- **API RESTful**: Endpoints para integração com outros sistemas
- **Estatísticas Detalhadas**: Gráficos e análises dos dados coletados

## 🛠 Tecnologias Utilizadas

### Backend
- **Django 4.2+**: Framework web principal
- **Django REST Framework**: APIs RESTful
- **Pillow**: Processamento de imagens
- **OpenCV**: Visão computacional
- **SQLite/PostgreSQL**: Banco de dados

### Frontend
- **HTML5/CSS3**: Estrutura e estilo
- **Tailwind CSS**: Framework CSS utilitário
- **JavaScript (ES6+)**: Interatividade e componentes
- **Leaflet.js**: Mapas interativos
- **Lucide Icons**: Iconografia

### IA/ML
- **YOLOv8**: Detecção e classificação de embarcações
- **NumPy**: Processamento numérico

## 🚀 Instalação e Configuração

### Pré-requisitos

- Python 3.8+
- pip (gerenciador de pacotes Python)
- Git

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/aritana.git
cd aritana
```

### 2. Crie um Ambiente Virtual

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 3. Instale as Dependências

```bash
pip install -r requirements.txt
```

### 4. Configure as Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações
```

### 5. Execute as Migrações

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Crie um Superusuário

```bash
python manage.py createsuperuser
```

### 7. Colete Arquivos Estáticos

```bash
python manage.py collectstatic
```

### 8. Execute o Servidor de Desenvolvimento

```bash
python manage.py runserver
```

O sistema estará disponível em `http://localhost:8000`

## 📁 Estrutura do Projeto

```
ARITANA/
├── aritana/                    # Configurações principais do Django
│   ├── settings.py            # Configurações do projeto
│   ├── urls.py                # URLs principais
│   └── wsgi.py                # Configuração WSGI
├── embarcacoes/               # App principal
│   ├── models.py              # Modelos de dados
│   ├── views.py               # Views e APIs
│   ├── services.py            # Lógica de negócio
│   ├── admin.py               # Interface administrativa
│   └── urls.py                # URLs do app
├── templates/                 # Templates HTML
│   ├── base.html              # Template base
│   └── embarcacoes/           # Templates específicos
│       ├── dashboard.html     # Dashboard principal
│       └── components/        # Componentes reutilizáveis
├── static/                    # Arquivos estáticos
│   ├── css/                   # Estilos CSS
│   └── js/                    # JavaScript
│       ├── aritana-core.js    # Core do sistema
│       └── components/        # Componentes JS
├── media/                     # Uploads de imagens
├── requirements.txt           # Dependências Python
├── .env.example              # Exemplo de configuração
└── README.md                 # Este arquivo
```

## 🔧 Componentes do Sistema

### Backend (Django)

#### Models
- **AnaliseEmbarcacao**: Armazena análises de imagens
- **EstatisticasRegiao**: Consolida estatísticas por região

#### Views/APIs
- **DashboardView**: Interface principal
- **upload_embarcacao**: API para upload e análise
- **estatisticas_gerais**: API de estatísticas
- **analises_mapa**: API de dados do mapa

#### Services
- **ProcessadorImagemService**: Processamento de IA
- **EstatisticasService**: Cálculos estatísticos

### Frontend (JavaScript Modular)

#### Core System (`aritana-core.js`)
- Inicialização do sistema
- Gerenciamento de estado global
- Utilitários comuns

#### Componentes Especializados
- **Upload Manager**: Gerencia uploads de arquivo
- **Map Manager**: Controla mapa interativo
- **Statistics Manager**: Gráficos e estatísticas
- **UI Components**: Componentes de interface

## 🎯 Uso do Sistema

### 1. Upload de Imagem
1. Acesse o dashboard principal
2. Arraste uma imagem ou clique em "Selecionar Arquivo"
3. Aguarde o processamento da IA
4. Visualize os resultados da análise

### 2. Visualização no Mapa
1. Os resultados aparecem automaticamente no mapa
2. Clique nos marcadores para ver detalhes
3. Use os filtros para visualizar apenas legal/ilegal

### 3. Estatísticas
1. Clique na aba "Gráficos e Estatísticas"
2. Visualize distribuição de legalidade
3. Acompanhe tendências temporais
4. Exporte dados em PDF/CSV/Excel

### 4. Administração
1. Acesse `/admin/` com credenciais de superusuário
2. Gerencie análises e estatísticas
3. Visualize thumbnails e detalhes
4. Execute ações em lote

## 🔌 API Endpoints

### Upload de Imagem
```http
POST /api/upload-embarcacao/
Content-Type: multipart/form-data

{
  "image": arquivo_imagem
}
```

### Estatísticas Gerais
```http
GET /api/estatisticas/

Response:
{
  "total_embarcacoes": 150,
  "embarcacoes_legais": 95,
  "embarcacoes_ilegais": 55,
  "taxa_legalidade": 63.33
}
```

### Dados do Mapa
```http
GET /api/mapa/?status=legal&limite=50

Response:
{
  "analises": [...],
  "total": 50
}
```

## 📊 Monitoramento e Logs

O sistema registra automaticamente:
- Uploads de imagens
- Resultados de análises
- Erros de processamento
- Estatísticas de uso

Logs são salvos em `logs/aritana.log` (configurável via `.env`)

## 🛡 Segurança

- Validação de tipos de arquivo (PNG, JPG, JPEG)
- Limite de tamanho de upload (10MB)
- Token CSRF para requisições
- Sanitização de dados de entrada

## 🚀 Deploy em Produção

### 1. Configuração do Servidor

#### Usando PostgreSQL
```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres createdb aritana_db
```

#### Configurar variáveis de ambiente
```bash
# .env para produção
DEBUG=False
ALLOWED_HOSTS=seu-dominio.com
DATABASE_URL=postgresql://user:password@localhost:5432/aritana_db
```

### 2. Servidor Web (Nginx + Gunicorn)

#### Instalar Gunicorn
```bash
pip install gunicorn
```

#### Configurar Nginx
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location /static/ {
        alias /path/to/aritana/staticfiles/;
    }
    
    location /media/ {
        alias /path/to/aritana/media/;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Executar com Gunicorn
```bash
gunicorn aritana.wsgi:application --bind 0.0.0.0:8000
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Equipe

- **Desenvolvimento**: Equipe ARITANA
- **IA/ML**: Especialistas em visão computacional
- **UX/UI**: Designers de interface

## 📞 Suporte

Para suporte técnico:
- Email: suporte@aritana.gov.br
- Issue Tracker: GitHub Issues
- Documentação: [Wiki do Projeto]

## 🔄 Changelog

### v1.0.0
- ✅ Sistema de upload de imagens
- ✅ Análise por IA (YOLOv8)
- ✅ Mapa interativo com Leaflet
- ✅ Dashboard responsivo
- ✅ API RESTful completa
- ✅ Interface administrativa
- ✅ Estatísticas e gráficos

---

**ARITANA** - Sistema de Identificação e Monitoramento de Embarcações  
Desenvolvido para a região do estuário do rio Pará 🌊 