# ARITANA

Monitoramento de embarcações com IA.

## Como rodar

**Docker**
```bash
cp .env.example .env
docker-compose up -d
```
Acesse `http://localhost:8000`.

**Local**
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py runserver
```

## Variáveis (.env)

```env
DEBUG=True
SECRET_KEY=sua-chave
ARITANA_API_URL=https://sua-api.com
ARITANA_API_KEY=sua-chave-api
FASTAPI_YOLO_URL=https://sua-api.com
```

## Uploads maiores que 10 MB

1. Ajuste `upload_imagem_grande.py` com suas credenciais.
2. Rode `python upload_imagem_grande.py`.
3. Monitore em `http://localhost:8000/historico/`.

Limite atual: 20 MB.


