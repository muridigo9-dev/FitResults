import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

// Definição de Tipos Simplificada Baseada no JSON v1.1
interface WorkoutExport {
    data: {
        title: string;
        description: string;
        category: string;
        blocks: WorkoutBlock[];
        media?: { url?: string };
    }
}

interface WorkoutBlock {
    type: 'single' | 'superset';
    exercises: WorkoutExercise[];
}

interface WorkoutExercise {
    name: string;
    image_url?: string; // Nova propriedade vinda do RPC atualizado
    metadata: {
        muscle_groups: string[];
        type: string;
        level: string;
        equipment?: string;
    };
    protocol: {
        sets: number;
        rest_seconds: number;
        execution: {
            type: 'reps' | 'time';
            mode: 'fixed' | 'variable' | null;
            value: string | string[] | null;
            duration_seconds: number | null;
        };
    };
}

// Utilitário para carregar imagem convertendo para Base64 (necessário para jsPDF)
const loadImageBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => {
            console.warn(`Falha ao carregar imagem PDF: ${url}`);
            resolve(null);
        };
        img.src = url;
    });
};

export const generateWorkoutPDF = async (workouts: WorkoutExport[], singleFile: boolean = false) => {
    const doc = new jsPDF();

    for (let i = 0; i < workouts.length; i++) {
        if (i > 0) doc.addPage();
        await drawWorkoutToDoc(doc, workouts[i]);
    }

    if (singleFile) {
        doc.save(`treinos-consolidado-${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
        doc.save(`treinos-${new Date().toISOString().split('T')[0]}.pdf`);
    }
};

const drawWorkoutToDoc = async (doc: jsPDF, workout: WorkoutExport) => {
    const pageWidth = doc.internal.pageSize.width;
    const marginX = 14;
    let cursorY = 20;

    // --- HEADER (CUSTOM) ---
    // Se for "Academia" (simulado por enquanto, ou vindo de config global futuramente)
    // Logo da FlexiBloom (Placeholder textual por enquanto)
    doc.setFontSize(16);
    doc.setTextColor(22, 163, 74); // Primary Green
    doc.setFont("helvetica", "bold");
    doc.text("FlexiBloom", pageWidth - marginX, cursorY, { align: 'right' });

    // Configurações do Treino
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Categoria: ${workout.data.category.toUpperCase()}`, marginX, cursorY);

    cursorY += 10;

    // Título
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const titleLines = doc.splitTextToSize(workout.data.title, pageWidth - (marginX * 2));
    doc.text(titleLines, marginX, cursorY);
    cursorY += (titleLines.length * 9);

    // Descrição
    if (workout.data.description) {
        cursorY += 2;
        // Box cinza para descrição
        doc.setFillColor(245, 245, 245);
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(60);

        const descLines = doc.splitTextToSize(workout.data.description, pageWidth - (marginX * 2) - 10);
        const boxHeight = (descLines.length * 5) + 6;

        doc.rect(marginX, cursorY, pageWidth - (marginX * 2), boxHeight, 'F');
        doc.text(descLines, marginX + 5, cursorY + 5);

        cursorY += boxHeight + 8;
    } else {
        cursorY += 5;
    }

    // --- EXERCÍCIOS ---
    const tableBody: RowInput[] = [];

    // Pré-processar imagens e dados para a tabela
    for (const block of workout.data.blocks) {
        const isSuperset = block.type === 'superset';

        if (isSuperset) {
            tableBody.push([{
                content: 'SUPERSET / CONJUGADO',
                colSpan: 4,
                styles: {
                    fillColor: [22, 163, 74] as any,
                    textColor: 255 as any,
                    halign: 'center' as any,
                    fontStyle: 'bold' as any,
                    fontSize: 8,
                    cellPadding: 2
                }
            }]);
        }

        for (const ex of block.exercises) {
            // 1. Dados de Execução (SAFE MODE)
            let execDetails = '';
            const exec = ex.protocol.execution;

            if (exec.type === 'time') {
                const timeVal = exec.duration_seconds || exec.value;
                execDetails = `⏱ ${timeVal ? timeVal + 's' : 'Tempo'}`;
            } else {
                // Repetições
                const val = exec.value;
                if (Array.isArray(val) && val.length > 0) {
                    execDetails = val.join('-');
                    execDetails += ' Reps';
                } else if (val !== null && val !== undefined && val !== '') {
                    execDetails = `${val} Reps`;
                } else {
                    execDetails = 'Falha';
                }
            }

            // 2. Metadados ricos
            const metaText = [
                ex.metadata.muscle_groups.join(', ') || 'Geral',
                ex.metadata.type ? `Tipo: ${ex.metadata.type}` : '',
                ex.metadata.level ? `Nível: ${ex.metadata.level}` : ''
            ].filter(Boolean).join(' • ');

            // 3. Imagem (Carregar se existir)
            let imgData: string | null = null;
            if (ex.image_url) {
                try {
                    console.log(`Carregando imagem PDF: ${ex.image_url.substring(0, 50)}...`);
                    imgData = await loadImageBase64(ex.image_url);
                } catch (e) { console.error('Erro img PDF:', e); }
            } else {
                // console.log('Sem URL de imagem para:', ex.name);
            }

            // Célula de Imagem (custom renderer)
            const imageCell = {
                content: '',
                styles: { minCellHeight: 20 }
            };

            // Célula Principal
            const mainCell = {
                content: `${ex.name}\n${metaText}`,
                styles: {
                    fontStyle: 'bold' as any,
                    textColor: (isSuperset ? [22, 163, 74] : [0, 0, 0]) as any
                }
            };

            const setsCell = {
                content: `${ex.protocol.sets} x`,
                styles: { valign: 'middle' as any, halign: 'center' as any, fontSize: 12, fontStyle: 'bold' as any }
            };

            const detailsCell = {
                content: `${execDetails}\nDescanso: ${ex.protocol.rest_seconds}s`,
                styles: { valign: 'middle' as any, halign: 'right' as any }
            };

            // Adiciona linha à tabela mas guarda a ref da imagem para o hook 'didDrawCell'
            tableBody.push([
                { ...imageCell, image: imgData } as any,
                mainCell,
                setsCell,
                detailsCell
            ]);
        }

        // Espaçador
        tableBody.push([{ content: '', colSpan: 4, styles: { cellPadding: 1, fillColor: 255, lineColor: 255 } }]);
    }

    // Renderizar Tabela
    autoTable(doc, {
        startY: cursorY,
        head: [],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle',
            lineColor: 240,
            lineWidth: 0.1,
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 20 }, // Imagem
            1: { cellWidth: 'auto' }, // Info
            2: { cellWidth: 15 }, // Sets
            3: { cellWidth: 40 }  // Meta
        },
        didDrawCell: (data) => {
            // Renderizar imagem manualmente se existir na célula
            if (data.column.index === 0 && data.cell.raw && (data.cell.raw as any).image) {
                const img = (data.cell.raw as any).image;
                const dim = 16; // Tamanho quadrado
                const x = data.cell.x + 2;
                const y = data.cell.y + 2;
                doc.addImage(img, 'JPEG', x, y, dim, dim);
            }
        }
    });

    // Footer Concat
    const pages = doc.getNumberOfPages();
    const PAGE_HEIGHT = doc.internal.pageSize.height;
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado via FlexiBloom - Página ${p} de ${pages}`, marginX, PAGE_HEIGHT - 10);
    }
};
