#!/bin/bash
# ================================================================
# Optik360 ERP — Google Cloud Run Deployment Script
# Kullanım: bash deploy.sh
# Ön koşul: gcloud CLI kurulu ve auth yapılmış olmalı
# ================================================================
set -e

# ─── Değiştirmeniz gereken değişkenler ───────────────────────────
PROJECT_ID="gen-lang-client-0693247342"
REGION="europe-west1"
SERVICE="optik360-api"
REPO="optik360"
DB_INSTANCE_NAME="optik360-pg"
DB_NAME="optik360_db"
DB_USER="optik360_user"
# ─────────────────────────────────────────────────────────────────

SQL_INSTANCE="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:latest"

echo "=== [1/7] Proje ayarlanıyor ==="
gcloud config set project $PROJECT_ID

echo "=== [2/7] Gerekli API'ler etkinleştiriliyor ==="
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com

echo "=== [3/7] Artifact Registry deposu oluşturuluyor ==="
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Optik360 Docker images" \
  2>/dev/null || echo "Depo zaten mevcut, devam ediliyor."

echo "=== [4/7] Cloud SQL PostgreSQL instance oluşturuluyor ==="
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-auto-increase \
  2>/dev/null || echo "Instance zaten mevcut, devam ediliyor."

gcloud sql databases create $DB_NAME \
  --instance=$DB_INSTANCE_NAME \
  2>/dev/null || echo "Veritabanı zaten mevcut."

echo "=== [5/7] Secret Manager'a değerler kaydediliyor ==="
echo "DB şifresi girin (en az 12 karakter):"
read -s DB_PASSWORD
printf '%s' "$DB_PASSWORD" | gcloud secrets create optik360-db-password \
  --data-file=- 2>/dev/null || \
printf '%s' "$DB_PASSWORD" | gcloud secrets versions add optik360-db-password --data-file=-

gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password="$DB_PASSWORD" \
  2>/dev/null || echo "Kullanıcı zaten mevcut."

echo "JWT secret girin (en az 32 karakter rastgele string):"
read -s JWT_SECRET
printf '%s' "$JWT_SECRET" | gcloud secrets create optik360-jwt-secret \
  --data-file=- 2>/dev/null || \
printf '%s' "$JWT_SECRET" | gcloud secrets versions add optik360-jwt-secret --data-file=-

echo "Anthropic API key girin (sk-ant-... — boş bırakabilirsiniz):"
read -s ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
  printf '%s' "$ANTHROPIC_KEY" | gcloud secrets create optik360-anthropic-key \
    --data-file=- 2>/dev/null || \
  printf '%s' "$ANTHROPIC_KEY" | gcloud secrets versions add optik360-anthropic-key --data-file=-
fi

echo "=== [6/7] Docker image build & push ==="
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
docker build -t $IMAGE -f Dockerfile .
docker push $IMAGE

echo "=== [7/7] Cloud Run deploy ==="
gcloud run deploy $SERVICE \
  --image=$IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-secrets="DB_PASSWORD=optik360-db-password:latest,JWT_SECRET=optik360-jwt-secret:latest" \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/${SQL_INSTANCE},DB_PORT=5432,DB_NAME=${DB_NAME},DB_USER=${DB_USER}" \
  --add-cloudsql-instances=$SQL_INSTANCE

SERVICE_URL=$(gcloud run services describe $SERVICE --region=$REGION --format='value(status.url)')
echo ""
echo "✅ Deploy tamamlandı!"
echo "🌐 URL: $SERVICE_URL"
echo ""
echo "Migration çalıştırmak için Cloud Shell'de:"
echo "  gcloud run jobs create optik360-migrate \\"
echo "    --image=$IMAGE \\"
echo "    --region=$REGION \\"
echo "    --set-env-vars=NODE_ENV=production,DB_HOST=/cloudsql/${SQL_INSTANCE},DB_NAME=${DB_NAME},DB_USER=${DB_USER} \\"
echo "    --set-secrets=DB_PASSWORD=optik360-db-password:latest \\"
echo "    --add-cloudsql-instances=$SQL_INSTANCE \\"
echo "    --command=node,migrate.js"
echo "  gcloud run jobs execute optik360-migrate --region=$REGION"
