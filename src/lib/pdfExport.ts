import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StudentReportData {
  studentName: string;
  studentEmail: string;
  trainerName: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    label: string;
    initial: number | null;
    current: number | null;
    unit: string;
    change?: number;
    changeType?: "positive" | "negative" | "neutral";
  }[];
  summary: {
    totalCheckins: number;
    averageStreak: number;
    longestStreak: number;
    workoutsCompleted: number;
    habitsCompleted: number;
    totalXP: number;
    currentLevel: number;
  };
  progressData: {
    date: string;
    weight?: number;
    workouts?: number;
    water?: number;
  }[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatChange(change: number | undefined, type: string | undefined): string {
  if (change === undefined || change === 0) return "—";
  const prefix = change > 0 ? "+" : "";
  const color = type === "positive" ? "#22c55e" : type === "negative" ? "#ef4444" : "#6b7280";
  return `<span style="color: ${color}; font-weight: 600;">${prefix}${change.toFixed(1)}%</span>`;
}

function generateMetricsTable(metrics: StudentReportData["metrics"]): string {
  const rows = metrics
    .map(
      (m) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(m.label)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${m.initial !== null ? `${m.initial} ${m.unit}` : "—"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${m.current !== null ? `${m.current} ${m.unit}` : "—"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${formatChange(m.change, m.changeType)}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Métrica</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Inicial</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Atual</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Variação</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateSummaryCards(summary: StudentReportData["summary"]): string {
  const cards = [
    { label: "Check-ins", value: summary.totalCheckins.toString(), icon: "📊" },
    { label: "Maior Streak", value: `${summary.longestStreak} dias`, icon: "🔥" },
    { label: "Treinos", value: summary.workoutsCompleted.toString(), icon: "💪" },
    { label: "Hábitos", value: summary.habitsCompleted.toString(), icon: "⭐" },
    { label: "XP Total", value: summary.totalXP.toLocaleString(), icon: "🏆" },
    { label: "Nível", value: summary.currentLevel.toString(), icon: "📈" },
  ];

  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0;">
      ${cards
        .map(
          (card) => `
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">${card.icon}</div>
          <div style="font-size: 24px; font-weight: 700; color: #111827;">${card.value}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">${card.label}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function generateProgressChart(progressData: StudentReportData["progressData"]): string {
  if (progressData.length === 0) return "";

  const weights = progressData.filter((d) => d.weight).map((d) => d.weight!);
  if (weights.length === 0) return "";

  const minWeight = Math.min(...weights) - 2;
  const maxWeight = Math.max(...weights) + 2;
  const range = maxWeight - minWeight;

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  const points = progressData
    .filter((d) => d.weight)
    .map((d, i, arr) => {
      const x = padding + (i / (arr.length - 1 || 1)) * innerWidth;
      const y = padding + innerHeight - ((d.weight! - minWeight) / range) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const yLabels = [minWeight, (minWeight + maxWeight) / 2, maxWeight].map((val, i) => {
    const y = padding + innerHeight - (i * innerHeight) / 2;
    return `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${val.toFixed(1)}</text>`;
  });

  const xLabels = progressData
    .filter((d) => d.weight)
    .filter((_, i, arr) => i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2))
    .map((d, i, arr) => {
      const x = padding + (i / (arr.length - 1 || 1)) * innerWidth;
      return `<text x="${x}" y="${chartHeight - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${d.date}</text>`;
    });

  return `
    <div style="margin: 20px 0;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Evolução do Peso</h3>
      <svg width="${chartWidth}" height="${chartHeight}" style="background: #fafafa; border-radius: 8px;">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + innerHeight}" stroke="#e5e7eb" stroke-width="1"/>
        <line x1="${padding}" y1="${padding + innerHeight}" x2="${padding + innerWidth}" y2="${padding + innerHeight}" stroke="#e5e7eb" stroke-width="1"/>
        <!-- Y axis labels -->
        ${yLabels.join("")}
        <!-- X axis labels -->
        ${xLabels.join("")}
        <!-- Chart line -->
        <polyline
          fill="none"
          stroke="url(#lineGradient)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          points="${points}"
        />
        <!-- Data points -->
        ${progressData
          .filter((d) => d.weight)
          .map((d, i, arr) => {
            const x = padding + (i / (arr.length - 1 || 1)) * innerWidth;
            const y = padding + innerHeight - ((d.weight! - minWeight) / range) * innerHeight;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#6366f1"/>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}

export function generateStudentReportHTML(data: StudentReportData): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Evolução - ${escapeHtml(data.studentName)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #111827;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
        <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">
          Relatório de Evolução
        </h1>
        <p style="font-size: 18px; color: #6b7280;">
          ${escapeHtml(data.studentName)}
        </p>
        <p style="font-size: 14px; color: #9ca3af; margin-top: 8px;">
          Período: ${format(data.period.start, "dd/MM/yyyy")} a ${format(data.period.end, "dd/MM/yyyy")}
        </p>
      </div>

      <!-- Trainer Info -->
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <p style="font-size: 14px; opacity: 0.9;">Personal Trainer</p>
        <p style="font-size: 20px; font-weight: 600;">${escapeHtml(data.trainerName)}</p>
      </div>

      <!-- Summary Cards -->
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Resumo do Período</h2>
      ${generateSummaryCards(data.summary)}

      <!-- Metrics Table -->
      <h2 style="font-size: 20px; font-weight: 600; margin-top: 40px; margin-bottom: 16px;">Evolução das Métricas</h2>
      ${generateMetricsTable(data.metrics)}

      <!-- Progress Chart -->
      ${generateProgressChart(data.progressData)}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="font-size: 12px; color: #9ca3af;">
          Relatório gerado em ${format(data.generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <!-- Print Button (no-print) -->
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        ">
          Imprimir / Salvar PDF
        </button>
      </div>
    </body>
    </html>
  `;
}

export function downloadStudentReportPDF(data: StudentReportData): void {
  const html = generateStudentReportHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      // Auto-trigger print dialog after load
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

export function openStudentReportInNewTab(data: StudentReportData): void {
  const html = generateStudentReportHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
