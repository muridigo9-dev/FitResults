# -*- coding: utf-8 -*-
"""
Migration Analysis Script - Python 2/3 compatible
Analisa todas as migrations para problemas de idempotencia
"""

import os
import re
from glob import glob

# Cores para output
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def find_migrations(migrations_dir):
    """Encontra todos os arquivos .sql no diretorio de migrations"""
    pattern = os.path.join(migrations_dir, "*.sql")
    return sorted(glob(pattern))

def analyze_migration(filepath):
    """Analisa uma migration e retorna lista de problemas"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    filename = os.path.basename(filepath)
    issues = []
    lines = content.split('\n')
    
    # 1. Verificar CREATE POLICY sem DROP IF EXISTS
    for i, line in enumerate(lines, 1):
        if re.search(r'CREATE\s+POLICY\s+"([^"]+)"', line, re.IGNORECASE):
            match = re.search(r'CREATE\s+POLICY\s+"([^"]+)"', line, re.IGNORECASE)
            policy_name = match.group(1)
            
            # Verifica se tem DROP correspondente nas linhas anteriores
            has_drop = False
            for j in range(max(0, i-20), i):
                if 'DROP POLICY IF EXISTS "{}"'.format(policy_name) in lines[j]:
                    has_drop = True
                    break
            
            if not has_drop:
                issues.append({
                    'type': 'critical',
                    'line': i,
                    'issue': 'CREATE POLICY sem DROP IF EXISTS: {}'.format(policy_name),
                    'code': line.strip()
                })
    
    # 2. Verificar INSERT sem ON CONFLICT
    in_insert = False
    insert_start_line = 0
    insert_lines = []
    
    for i, line in enumerate(lines, 1):
        if re.search(r'INSERT\s+INTO', line, re.IGNORECASE):
            in_insert = True
            insert_start_line = i
            insert_lines = [line]
        elif in_insert:
            insert_lines.append(line)
            if ';' in line:
                full_insert = ' '.join(insert_lines)
                if 'ON CONFLICT' not in full_insert.upper():
                    issues.append({
                        'type': 'warning',
                        'line': insert_start_line,
                        'issue': 'INSERT sem ON CONFLICT (pode duplicar dados)',
                        'code': lines[insert_start_line-1].strip()[:80]
                    })
                in_insert = False
                insert_lines = []
    
    return filename, issues

def main():
    migrations_dir = "supabase/migrations"
    
    print("{}🔍 Auditando migrations...{}\n".format(BLUE, NC))
    
    migrations = find_migrations(migrations_dir)
    
    if not migrations:
        print("{}❌ Nenhuma migration encontrada em {}{}".format(RED, migrations_dir, NC))
        return 1
    
    print("📁 Encontradas {} migrations\n".format(len(migrations)))
    print("=" * 80)
    
    total_critical = 0
    total_warnings = 0
    problematic_files = []
    
    for migration in migrations:
        filename, issues = analyze_migration(migration)
        
        if issues:
            problematic_files.append((filename, issues))
            
            critical_issues = [i for i in issues if i['type'] == 'critical']
            warning_issues = [i for i in issues if i['type'] == 'warning']
            
            total_critical += len(critical_issues)
            total_warnings += len(warning_issues)
            
            print("\n{}📄 {}{}".format(YELLOW, filename, NC))
            
            for issue in critical_issues:
                print("  {}❌ CRITICO (linha {}): {}{}".format(RED, issue['line'], issue['issue'], NC))
                print("     {}{}{}".format(BLUE, issue['code'][:100], NC))
            
            for issue in warning_issues:
                print("  {}⚠️  AVISO (linha {}): {}{}".format(YELLOW, issue['line'], issue['issue'], NC))
                print("     {}".format(issue['code'][:100]))
    
    print("\n" + "=" * 80)
    print("\n📊 RESUMO:")
    print("  • Total de migrations: {}".format(len(migrations)))
    print("  • Migrations com problemas: {}".format(len(problematic_files)))
    print("  • {}Problemas criticos: {}{}".format(RED, total_critical, NC))
    print("  • {}Avisos: {}{}".format(YELLOW, total_warnings, NC))
    
    if total_critical == 0 and total_warnings == 0:
        print("\n{}✅ Todas as migrations estao seguindo as guidelines!{}".format(GREEN, NC))
        return 0
    else:
        print("\n{}⚠️  Revise as migrations acima e corrija os problemas.{}".format(YELLOW, NC))
        print("{}📖 Consulte: docs/MIGRATION_GUIDELINES.md{}".format(BLUE, NC))
        return 1

if __name__ == "__main__":
    exit(main())
