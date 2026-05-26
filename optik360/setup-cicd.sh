#!/bin/bash
# ================================================================
# Optik360 — GitHub ↔ Cloud Build CI/CD Kurulum Scripti
# Kullanım: bash optik360/setup-cicd.sh
# ================================================================
set -e

# ─── Değiştirin ──────────────────────────────────────────────────
PROJECT_ID="gen-lang-client-0693247342"
REGION="europe-west1"
DB_INSTANCE_NAME="optik360-pg"
GITHUB_OWNER="veralbilgehan"
GITHUB_REPO="assessment-platform"
# ─────────────────────────────────────────────────────────────────

SQL_INSTANCE="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"

echo "=== [1/5] Cloud Build Service Account'a yetkiler veriliyor ==="
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer"

echo "  ✓ Yetkiler verildi: ${CB_SA}"

echo "=== [2/5] trigger.yaml içindeki PLACEHOLDER güncelleniyor ==="
sed -i "s|PLACEHOLDER|${SQL_INSTANCE}|g" optik360/trigger.yaml
sed -i "s|YOUR_PROJECT_ID|${PROJECT_ID}|g" optik360/trigger.yaml
sed -i "s|YOUR_PROJECT_ID|${PROJECT_ID}|g" optik360/cloudbuild.yaml
echo "  ✓ trigger.yaml güncellendi"

echo "=== [3/5] GitHub bağlantısı kontrol ediliyor ==="
echo ""
echo "  ⚠️  GitHub bağlantısı MANUEL adım gerektirir:"
echo "  1. https://console.cloud.google.com/cloud-build/triggers adresine gidin"
echo "  2. 'Connect Repository' → 'GitHub (Cloud Build GitHub App)' seçin"
echo "  3. ${GITHUB_OWNER}/${GITHUB_REPO} reposuna izin verin"
echo "  4. Bağlantı tamamlandıktan sonra bu scripti devam ettirin"
echo ""
read -p "  GitHub bağlantısını tamamladıktan sonra Enter'a basın..."

echo "=== [4/5] Cloud Build trigger oluşturuluyor ==="
gcloud builds triggers import \
  --project=$PROJECT_ID \
  --source=optik360/trigger.yaml

echo "  ✓ Trigger oluşturuldu: optik360-main-deploy"

echo "=== [5/5] İlk manuel build tetikleniyor ==="
gcloud builds triggers run optik360-main-deploy \
  --project=$PROJECT_ID \
  --branch=main

echo ""
echo "✅ CI/CD kurulumu tamamlandı!"
echo ""
echo "Pipeline akışı:"
echo "  GitHub push → main branch"
echo "    → Cloud Build tetiklenir (optik360/** dosyaları değiştiyse)"
echo "    → Backend kontrol + Frontend build"
echo "    → Docker image → Artifact Registry"
echo "    → Cloud Run deploy"
echo ""
echo "Build geçmişini takip etmek için:"
echo "  https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
