#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration Analysis Script
Analisa todas as migrations para problemas de idempotencia
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Tuple

# Cores para output
class Colors:
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    GREEN = '\033[0;32m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def find_migrations(migrations_dir: str) -> List[Path]:
    """Encontra todos os arquivos .sql no diretório de migrations"""
    return sorted(Path(migrations_dir).glob("*.sql"))

def check_alter_table_without_check(content: str, filename: str) -> List[Dict]:
    """Verifica ALTER TABLE ADD COLUMN sem IF NOT EXISTS ou DO $$"""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # Verifica se tem ALTER TABLE ADD COLUMN
        if re.search(r'ALTER\s+TABLE.*ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)', line, re.IGNORECASE):
            # Verifica se não está dentro de um bloco DO $$
            # Procura por DO $$ nas linhas anteriores (até 10 linhas antes)
            in_do_block = False
            for j in range(max(0, i-10), i):
                if 'DO $$' in lines[j] or 'DO $' in lines[j]:
                    in_do_block = True
                    break
            
            if not in_do_block and 'IF NOT EXISTS' not in line:
                issues.append({
                    'type': 'critical',
                    'line': i,
                    'issue': 'ALTER TABLE ADD COLUMN sem IF NOT EXISTS ou DO $$',
                    'code': line.strip()
                })
    
    return issues

def check_create_policy_without_drop(content: str, filename: str) -> List[Dict]:
    """Verifica CREATE POLICY sem DROP IF EXISTS anterior"""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        if re.search(r'CREATE\s+POLICY\s+"([^"]+)"', line, re.IGNORECASE):
            policy_name = re.search(r'CREATE\s+POLICY\s+"([^"]+)"', line, re.IGNORECASE).group(1)
            
            # Verifica se tem DROP correspondente nas linhas anteriores (até 20 linhas antes)
            has_drop = False
            for j in range(max(0, i-20), i):
                if f'DROP POLICY IF EXISTS "{policy_name}"' in lines[j]:
                    has_drop = True
                    break
            
            if not has_drop:
                issues.append({
                    'type': 'critical',
                    'line': i,
                    'issue': f'CREATE POLICY sem DROP IF EXISTS: {policy_name}',
                    'code': line.strip()
                })
    
    return issues

def check_create_index_without_if_not_exists(content: str, filename: str) -> List[Dict]:
    """Verifica CREATE INDEX sem IF NOT EXISTS"""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        if re.search(r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)', line, re.IGNORECASE):
            if 'IF NOT EXISTS' not in line:
                issues.append({
                    'type': 'warning',
                    'line': i,
                    'issue': 'CREATE INDEX sem IF NOT EXISTS',
                    'code': line.strip()
                })
    
    return issues

def check_create_trigger_without_drop(content: str, filename: str) -> List[Dict]:
    """Verifica CREATE TRIGGER sem DROP IF EXISTS"""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        if re.search(r'CREATE\s+TRIGGER\s+(\w+)', line, re.IGNORECASE):
            trigger_name = re.search(r'CREATE\s+TRIGGER\s+(\w+)', line, re.IGNORECASE).group(1)
            
            # Verifica se tem DROP correspondente nas linhas anteriores
            has_drop = False
            for j in range(max(0, i-10), i):
                if f'DROP TRIGGER IF EXISTS {trigger_name}' in lines[j]:
                    has_drop = True
                    break
            
            if not has_drop:
                issues.append({
                    'type': 'warning',
                    'line': i,
                    'issue': f'CREATE TRIGGER sem DROP IF EXISTS: {trigger_name}',
                    'code': line.strip()
                })
    
    return issues

def check_insert_without_conflict(content: str, filename: str) -> List[Dict]:
    """Verifica INSERT sem ON CONFLICT"""
    issues = []
    lines = content.split('\n')
    
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
                # Fim do INSERT, verificar se tem ON CONFLICT
                full_insert = ' '.join(insert_lines)
                if 'ON CONFLICT' not in full_insert.upper():
                    issues.append({
                        'type': 'warning',
                        'line': insert_start_line,
                        'issue': 'INSERT sem ON CONFLICT (pode duplicar dados)',
                        'code': lines[insert_start_line-1].strip()[:80] + '...'
                    })
                in_insert = False
                insert_lines = []
    
    return issues

def check_create_table_without_if_not_exists(content: str, filename: str) -> List[Dict]:
    """Verifica CREATE TABLE sem IF NOT EXISTS"""
    issues = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        if re.search(r'CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)', line, re.IGNORECASE):
            if 'IF NOT EXISTS' not in line:
                issues.append({
                    'type': 'warning',
                    'line': i,
                    'issue': 'CREATE TABLE sem IF NOT EXISTS',
                    'code': line.strip()
                })
    
    return issues

def analyze_migration(filepath: Path) -> Tuple[str, List[Dict]]:
    """Analisa uma migration e retorna lista de problemas"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    filename = filepath.name
    all_issues = []
    
    # Executar todas as verificações
    all_issues.extend(check_alter_table_without_check(content, filename))
    all_issues.extend(check_create_policy_without_drop(content, filename))
    all_issues.extend(check_create_index_without_if_not_exists(content, filename))
    all_issues.extend(check_create_trigger_without_drop(content, filename))
    all_issues.extend(check_insert_without_conflict(content, filename))
    all_issues.extend(check_create_table_without_if_not_exists(content, filename))
    
    return filename, all_issues

def main():
    migrations_dir = "supabase/migrations"
    
    print(f"{Colors.BLUE}🔍 Auditando migrations...{Colors.NC}\n")
    
    migrations = find_migrations(migrations_dir)
    
    if not migrations:
        print(f"{Colors.RED}❌ Nenhuma migration encontrada em {migrations_dir}{Colors.NC}")
        return
    
    print(f"📁 Encontradas {len(migrations)} migrations\n")
    print("━" * 80)
    
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
            
            print(f"\n{Colors.YELLOW}📄 {filename}{Colors.NC}")
            
            for issue in critical_issues:
                print(f"  {Colors.RED}❌ CRÍTICO (linha {issue['line']}):{ Colors.NC} {issue['issue']}")
                print(f"     {Colors.BLUE}{issue['code'][:100]}{Colors.NC}")
            
            for issue in warning_issues:
                print(f"  {Colors.YELLOW}⚠️  AVISO (linha {issue['line']}):{ Colors.NC} {issue['issue']}")
                print(f"     {issue['code'][:100]}")
    
    print("\n" + "━" * 80)
    print(f"\n📊 RESUMO:")
    print(f"  • Total de migrations: {len(migrations)}")
    print(f"  • Migrations com problemas: {len(problematic_files)}")
    print(f"  • {Colors.RED}Problemas críticos: {total_critical}{Colors.NC}")
    print(f"  • {Colors.YELLOW}Avisos: {total_warnings}{Colors.NC}")
    
    if total_critical == 0 and total_warnings == 0:
        print(f"\n{Colors.GREEN}✅ Todas as migrations estão seguindo as guidelines!{Colors.NC}")
        return 0
    else:
        print(f"\n{Colors.YELLOW}⚠️  Revise as migrations acima e corrija os problemas.{Colors.NC}")
        print(f"{Colors.BLUE}📖 Consulte: docs/MIGRATION_GUIDELINES.md{Colors.NC}")
        return 1

if __name__ == "__main__":
    exit(main())
