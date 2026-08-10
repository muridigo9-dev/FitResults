#!/bin/bash

# ============================================
# MIGRATION AUDIT SCRIPT
# ============================================
# Verifica todas as migrations para problemas comuns
# Uso: bash scripts/audit-migrations.sh

echo "🔍 Auditando migrations..."
echo ""

MIGRATIONS_DIR="supabase/migrations"
ISSUES_FOUND=0

# Cores para output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Função para reportar problema
report_issue() {
    local file=$1
    local issue=$2
    local line=$3
    echo -e "${RED}❌ PROBLEMA:${NC} $file"
    echo -e "   ${YELLOW}Linha $line:${NC} $issue"
    echo ""
    ((ISSUES_FOUND++))
}

# Função para reportar aviso
report_warning() {
    local file=$1
    local warning=$2
    echo -e "${YELLOW}⚠️  AVISO:${NC} $file"
    echo -e "   $warning"
    echo ""
}

# 1. Verificar ALTER TABLE sem IF NOT EXISTS
echo "1️⃣  Verificando ALTER TABLE sem IF NOT EXISTS..."
while IFS= read -r file; do
    # Verificar se tem ALTER TABLE ADD COLUMN sem IF NOT EXISTS e sem DO $$
    if grep -q "ALTER TABLE.*ADD COLUMN [^I]" "$file" && ! grep -q "IF NOT EXISTS" "$file" && ! grep -q "DO \$\$" "$file"; then
        line=$(grep -n "ALTER TABLE.*ADD COLUMN" "$file" | head -1 | cut -d: -f1)
        report_issue "$file" "ALTER TABLE ADD COLUMN sem IF NOT EXISTS ou DO \$\$" "$line"
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 2. Verificar CREATE POLICY sem DROP IF EXISTS
echo "2️⃣  Verificando CREATE POLICY sem DROP IF EXISTS..."
while IFS= read -r file; do
    if grep -q "CREATE POLICY" "$file"; then
        # Para cada CREATE POLICY, verificar se tem DROP correspondente
        while IFS= read -r policy_line; do
            policy_name=$(echo "$policy_line" | sed -n 's/.*CREATE POLICY "\([^"]*\)".*/\1/p')
            if [ -n "$policy_name" ]; then
                if ! grep -q "DROP POLICY IF EXISTS \"$policy_name\"" "$file"; then
                    line=$(grep -n "CREATE POLICY \"$policy_name\"" "$file" | head -1 | cut -d: -f1)
                    report_issue "$file" "CREATE POLICY sem DROP IF EXISTS: $policy_name" "$line"
                fi
            fi
        done < <(grep "CREATE POLICY" "$file")
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 3. Verificar CREATE INDEX sem IF NOT EXISTS
echo "3️⃣  Verificando CREATE INDEX sem IF NOT EXISTS..."
while IFS= read -r file; do
    if grep -q "CREATE INDEX [^I]" "$file" && ! grep -q "IF NOT EXISTS" "$file"; then
        line=$(grep -n "CREATE INDEX" "$file" | head -1 | cut -d: -f1)
        report_warning "$file" "CREATE INDEX sem IF NOT EXISTS (linha $line)"
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 4. Verificar CREATE TRIGGER sem DROP IF EXISTS
echo "4️⃣  Verificando CREATE TRIGGER sem DROP IF EXISTS..."
while IFS= read -r file; do
    if grep -q "CREATE TRIGGER" "$file"; then
        while IFS= read -r trigger_line; do
            trigger_name=$(echo "$trigger_line" | sed -n 's/.*CREATE TRIGGER \([^ ]*\).*/\1/p')
            if [ -n "$trigger_name" ]; then
                if ! grep -q "DROP TRIGGER IF EXISTS $trigger_name" "$file"; then
                    line=$(grep -n "CREATE TRIGGER $trigger_name" "$file" | head -1 | cut -d: -f1)
                    report_warning "$file" "CREATE TRIGGER sem DROP IF EXISTS: $trigger_name (linha $line)"
                fi
            fi
        done < <(grep "CREATE TRIGGER" "$file")
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 5. Verificar INSERT sem ON CONFLICT
echo "5️⃣  Verificando INSERT sem ON CONFLICT..."
while IFS= read -r file; do
    if grep -q "INSERT INTO" "$file" && ! grep -q "ON CONFLICT" "$file"; then
        line=$(grep -n "INSERT INTO" "$file" | head -1 | cut -d: -f1)
        report_warning "$file" "INSERT sem ON CONFLICT (pode duplicar dados) (linha $line)"
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 6. Verificar CREATE TABLE sem IF NOT EXISTS
echo "6️⃣  Verificando CREATE TABLE sem IF NOT EXISTS..."
while IFS= read -r file; do
    if grep -q "CREATE TABLE [^I]" "$file" && ! grep -q "IF NOT EXISTS" "$file"; then
        line=$(grep -n "CREATE TABLE" "$file" | head -1 | cut -d: -f1)
        report_warning "$file" "CREATE TABLE sem IF NOT EXISTS (linha $line)"
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

# 7. Verificar ALTER TYPE sem verificação
echo "7️⃣  Verificando ALTER TYPE sem verificação..."
while IFS= read -r file; do
    if grep -q "ALTER TYPE.*ADD VALUE" "$file" && ! grep -q "IF NOT EXISTS" "$file" && ! grep -q "DO \$\$" "$file"; then
        line=$(grep -n "ALTER TYPE.*ADD VALUE" "$file" | head -1 | cut -d: -f1)
        report_warning "$file" "ALTER TYPE ADD VALUE sem verificação (linha $line)"
    fi
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum problema crítico encontrado!${NC}"
else
    echo -e "${RED}❌ Total de problemas críticos: $ISSUES_FOUND${NC}"
    echo -e "${YELLOW}⚠️  Revise as migrations acima e corrija os problemas.${NC}"
    exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
