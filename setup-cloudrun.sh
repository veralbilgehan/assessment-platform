#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Assessment Platform — Google Cloud Run Otomatik Kurulum Scripti
# Kullanım: bash setup-cloudrun.sh
# Gereksinimler: gcloud CLI (kurulu ve PATH'de)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"
info()    { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*"; exit 1; }
header()  { echo -e "\n${BOLD}── $* ──${RESET}"; }

# ─── Sabitler ────────────────────────────────────────────────────────────────
REGION="europe-west1"
SERVICE_NAME="assessment-platform"
SA_NAME="assessment-deploy"
SA_DISPLAY="Assessment Platform Deploy"
GITHUB_REPO="veralbilgehan/assessment-platform"
KEY_FILE="$HOME/.config/gcloud/assessment-sa-key.json"
JWT_SECRET_FILE="$HOME/.config/gcloud/assessment-jwt-secret.txt"

# ─── Ön Kontrol ──────────────────────────────────────────────────────────────
header "Ön Kontrol"
command -v gcloud &>/dev/null || error "gcloud CLI bulunamadı. https://cloud.google.com/sdk/docs/install adresinden kurun."
info "gcloud CLI bulundu"

# gh CLI kontrolü (opsiyonel — yoksa secrets'ları manuel ekleyeceksin)
GH_AVAILABLE=false
if command -v gh &>/dev/null; then
  GH_AVAILABLE=true
  info "gh CLI bulundu — GitHub Secrets otomatik eklenecek"
else
  warn "gh CLI bulunamadı — Secrets'ları GitHub'a manuel eklemen gerekecek"
fi

# ─── GCP Giriş ───────────────────────────────────────────────────────────────
header "Google Cloud Girişi"
if ! gcloud auth print-access-token &>/dev/null 2>&1; then
  echo "Tarayıcı açılacak — Google hesabınızla giriş yapın:"
  gcloud auth login --quiet
else
  info "Zaten giriş yapılmış: $(gcloud config get-value account 2>/dev/null)"
fi

# ─── Proje Seç / Oluştur ─────────────────────────────────────────────────────
header "GCP Projesi"
echo "Mevcut projeler:"
gcloud projects list --format="table(projectId,name,projectNumber)" 2>/dev/null || true
echo ""
read -rp "Proje ID girin (yoksa yeni oluşturulacak, boş bırakın): " INPUT_PROJECT

if [[ -z "$INPUT_PROJECT" ]]; then
  PROJECT_ID="assessment-$(date +%s | tail -c 6)"
  echo "Yeni proje oluşturuluyor: $PROJECT_ID"
  gcloud projects create "$PROJECT_ID" --name="Assessment Platform" 2>/dev/null || true
  info "Proje oluşturuldu: $PROJECT_ID"
else
  PROJECT_ID="$INPUT_PROJECT"
  info "Proje seçildi: $PROJECT_ID"
fi

gcloud config set project "$PROJECT_ID" --quiet
info "Aktif proje: $PROJECT_ID"

# Billing hesabını bağla
BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" --filter="open=true" 2>/dev/null | head -1 || echo "")
if [[ -n "$BILLING_ACCOUNT" ]]; then
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --quiet 2>/dev/null || true
  info "Billing bağlandı: $BILLING_ACCOUNT"
else
  warn "Billing hesabı bulunamadı — GCP Console'dan manuel bağlayın"
fi

# ─── API'ları Etkinleştir ─────────────────────────────────────────────────────
header "API'ları Etkinleştirme"
APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "iam.googleapis.com"
)
for api in "${APIS[@]}"; do
  echo -n "  → $api ... "
  gcloud services enable "$api" --quiet 2>/dev/null && echo "aktif" || echo "zaten aktif"
done
info "Tüm API'lar etkinleştirildi"

# ─── Service Account ─────────────────────────────────────────────────────────
header "Service Account Oluşturma"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" --quiet &>/dev/null 2>&1; then
  info "Service Account zaten var: $SA_EMAIL"
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="$SA_DISPLAY" \
    --quiet
  info "Service Account oluşturuldu: $SA_EMAIL"
fi

ROLES=(
  "roles/run.admin"
  "roles/cloudbuild.builds.editor"
  "roles/artifactregistry.admin"
  "roles/storage.admin"
  "roles/iam.serviceAccountUser"
)
for role in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$role" \
    --quiet 2>/dev/null | grep -q "Updated" && echo "  → $role eklendi" || echo "  → $role zaten var"
done

mkdir -p "$(dirname "$KEY_FILE")"
if [[ -f "$KEY_FILE" ]]; then
  warn "SA key zaten var: $KEY_FILE"
else
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL" \
    --quiet
  info "SA key oluşturuldu: $KEY_FILE"
fi

# ─── Artifact Registry ───────────────────────────────────────────────────────
header "Artifact Registry"
REPO_NAME="assessment-images"
if gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --quiet &>/dev/null 2>&1; then
  info "Registry zaten var: $REPO_NAME"
else
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Assessment Platform Docker Images" \
    --quiet
  info "Registry oluşturuldu: $REPO_NAME"
fi

# ─── Veritabanı Bilgileri ─────────────────────────────────────────────────────
header "Veritabanı Bağlantı Bilgileri"
echo "PostgreSQL bağlantı bilgilerinizi girin:"
read -rp "  DB_HOST: " DB_HOST
read -rp "  DB_PORT (varsayılan 5432): " DB_PORT
DB_PORT="${DB_PORT:-5432}"
read -rp "  DB_NAME: " DB_NAME
read -rp "  DB_USER: " DB_USER
read -rsp "  DB_PASSWORD: " DB_PASSWORD
echo ""

# ─── ANTHROPIC API KEY ───────────────────────────────────────────────────────
header "API Anahtarları"
read -rsp "  ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY
echo ""

# ─── JWT Secret Üret ─────────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 64 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(64))")
echo "$JWT_SECRET" > "$JWT_SECRET_FILE"
info "JWT_SECRET üretildi ve kaydedildi: $JWT_SECRET_FILE"

# ─── İlk Cloud Run Deploy ────────────────────────────────────────────────────
header "Cloud Run Servisi Oluşturma (ilk deploy)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "Docker image build ediliyor ve push'lanıyor..."
gcloud builds submit \
  --tag "$IMAGE_URL" \
  --project "$PROJECT_ID" \
  --quiet

info "Image build edildi: $IMAGE_URL"

echo "Cloud Run servisi oluşturuluyor..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URL" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "NODE_ENV=production,DB_HOST=${DB_HOST},DB_PORT=${DB_PORT},DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},JWT_SECRET=${JWT_SECRET},ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format "value(status.url)" \
  --quiet)

info "Cloud Run servisi oluşturuldu: $SERVICE_URL"

# ─── GitHub Secrets ──────────────────────────────────────────────────────────
header "GitHub Secrets"
SA_KEY_JSON=$(cat "$KEY_FILE")

if [[ "$GH_AVAILABLE" == "true" ]]; then
  echo "GitHub'a giriş yapılıyor..."
  gh auth status &>/dev/null 2>&1 || gh auth login

  declare -A SECRETS=(
    ["GCP_SA_KEY"]="$SA_KEY_JSON"
    ["GCP_SERVICE_NAME"]="$SERVICE_NAME"
    ["DB_HOST"]="$DB_HOST"
    ["DB_PORT"]="$DB_PORT"
    ["DB_NAME"]="$DB_NAME"
    ["DB_USER"]="$DB_USER"
    ["DB_PASSWORD"]="$DB_PASSWORD"
    ["JWT_SECRET"]="$JWT_SECRET"
    ["ANTHROPIC_API_KEY"]="$ANTHROPIC_API_KEY"
  )

  for key in "${!SECRETS[@]}"; do
    echo -n "  → $key ... "
    echo "${SECRETS[$key]}" | gh secret set "$key" --repo="$GITHUB_REPO" 2>/dev/null && echo "eklendi" || echo "hata"
  done
  info "GitHub Secrets eklendi"
else
  SECRETS_FILE="$HOME/.config/gcloud/assessment-secrets.txt"
  cat > "$SECRETS_FILE" << EOF
# Bu bilgileri GitHub → Settings → Secrets → Actions'a ekleyin
# Repo: $GITHUB_REPO

GCP_SA_KEY (tüm içerik):
$(cat "$KEY_FILE")

GCP_SERVICE_NAME=$SERVICE_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
EOF
  warn "gh CLI yok — Secrets bilgileri buraya kaydedildi: $SECRETS_FILE"
  warn "Bu dosyayı okuyup GitHub'a manuel ekleyin, sonra güvenli silin!"
fi

# ─── Özet ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  KURULUM TAMAMLANDI!${RESET}"
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "  Proje ID     : ${BOLD}$PROJECT_ID${RESET}"
echo -e "  Servis Adı   : ${BOLD}$SERVICE_NAME${RESET}"
echo -e "  Bölge        : ${BOLD}$REGION${RESET}"
echo -e "  Uygulama URL : ${BOLD}${SERVICE_URL}${RESET}"
echo ""
echo "  Artık master'a her push'ta otomatik deploy olacak."
echo ""
echo "  Veritabanı migration'larını çalıştırmayı unutmayın."
echo -e "${BOLD}════════════════════════════════════════${RESET}"
