#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependências
pip install -r requirements.txt

# Coletar arquivos estáticos
python manage.py collectstatic --noinput

# Executar migrações
python manage.py migrate

# Criar superusuário se não existir
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@aritana.com', 'admin123')
    print('Superusuário admin criado com sucesso!')
else:
    print('Superusuário admin já existe.')
"

# Popular dados de exemplo
python manage.py populate_sample_data 