import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { toast } from 'sonner';

// Types baseados na estrutura de Exportação V1.0
interface DietPlanExport {
    data: {
        title: string;
        description: string;
        days: DietDay[];
    }
}

interface DietDay {
    name: string;
    meals: DietMeal[];
}

interface DietMeal {
    name: string;
    time_suggestion: string;
    items: DietItem[];
}

interface DietItem {
    dish_name: string;
    dish_details?: {
        image_url?: string;
        ingredients: { name: string; quantity: number | string; metric_unit: string }[];
    };
    quantity_override?: string;
    observation?: string;
    is_optional?: boolean;
}

// Helpers
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
        img.onerror = () => resolve(null); // Fail safe
        img.src = url;
    });
};

export const generateDietPDF = async (plan: any) => {
    const doc = new jsPDF();

    // Handle potential array from RPC or single object
    const data = Array.isArray(plan.data) ? plan.data[0] : plan.data;

    if (!data || !data.title) {
        console.error("Plan data is missing or title is undefined", data);
        toast.error("Erro: Dados do plano incompletos para gerar PDF");
        return;
    }

    // --- HEADER ---
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74); // Green
    doc.text(String(data.title).toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    if (data.description) {
        const descLines = doc.splitTextToSize(data.description, 180);
        doc.text(descLines, 14, 28);
    }

    let cursorY = 40;

    // --- BODY ---
    for (const day of data.days) {
        // Day Header
        doc.setFillColor(240, 253, 244); // Light Green bg
        doc.rect(14, cursorY, 182, 8, 'F');
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(day.name.toUpperCase(), 16, cursorY + 5.5);
        cursorY += 12;

        for (const meal of day.meals) {
            // Meal Sub-header
            doc.setFontSize(10);
            doc.setTextColor(50);
            doc.setFont("helvetica", "bold");
            const time = meal.time_suggestion ? ` - ${meal.time_suggestion.substring(0, 5)}` : '';
            doc.text(`${meal.name}${time}`, 14, cursorY);
            cursorY += 4;

            // Carregar Imagens Prévia
            const imagesMap: Record<number, string | null> = {};
            for (let i = 0; i < meal.items.length; i++) {
                const item = meal.items[i];
                if (item.dish_details?.image_url) {
                    try {
                        imagesMap[i] = await loadImageBase64(item.dish_details.image_url);
                    } catch (e) {
                        console.warn('Erro ao carregar imagem para PDF', e);
                    }
                }
            }

            // Table for Meal Items
            const tableBody: RowInput[] = [];

            for (const item of meal.items) {
                let ingredientsText = '';

                // Quantidade Customizada ou Lista de Ingredientes
                if (item.quantity_override) {
                    ingredientsText = item.quantity_override;
                } else if (item.dish_details?.ingredients) {
                    ingredientsText = item.dish_details.ingredients
                        .map(i => `• ${i.quantity}${i.metric_unit} ${i.name}`)
                        .join('\n');
                }

                if (item.observation) {
                    ingredientsText += `\n\nObs: ${item.observation}`;
                }

                // Handle Image and Substitution label
                let dishTitle = item.dish_name + (item.is_optional ? ' (Opcional)' : '');
                if (!item.is_optional && item.quantity_override && item.quantity_override.toLowerCase().includes('substitui')) {
                    dishTitle += ' (Substituição)';
                }

                tableBody.push([
                    {
                        content: dishTitle,
                        styles: { fontStyle: 'bold', fontSize: 10, textColor: [30, 30, 30] },
                    },
                    {
                        content: ingredientsText,
                        styles: { fontSize: 9, textColor: [80, 80, 80] }
                    }
                ]);
            }

            autoTable(doc, {
                startY: cursorY,
                body: tableBody,
                theme: 'grid',
                columns: [
                    { header: 'Prato', dataKey: 'dish' },
                    { header: 'Composição', dataKey: 'details' }
                ],
                head: [],
                columnStyles: {
                    0: { cellWidth: 70, minCellHeight: 25 }, // Altura mínima para imagem
                    1: { cellWidth: 'auto' }
                },
                styles: {
                    cellPadding: 4,
                    overflow: 'linebreak',
                    lineColor: [230, 230, 230],
                    lineWidth: 0.1,
                    valign: 'middle' // Alinhar verticalmente
                },
                margin: { left: 14, right: 14 },
                didDrawCell: (data) => {
                    // Desenhar imagem se existir e for a coluna do prato
                    if (data.column.index === 0 && data.cell.section === 'body') {
                        const rowIndex = data.row.index;
                        const imgBase64 = imagesMap[rowIndex];

                        if (imgBase64) {
                            // Dimensões da célula
                            const cellX = data.cell.x + 4; // Padding left
                            // Texto ocupa o topo, imagem abaixo
                            // Estimar altura do texto (simples)
                            const textHeight = data.cell.height - 20; // Espaço restante
                            const imgY = data.cell.y + data.cell.height - 22; // 2mm de padding bottom + 20mm imagem

                            // Se a célula for muito pequena, o autotable expande, mas vamos garantir que a imagem caiba
                            // Aqui desenhamos fixo no canto inferior da célula ou abaixo do texto se possível.
                            // Uma abordagem melhor é definir a imagem num canto fixo.
                            // Vamos colocar a imagem no canto direito ou abaixo do texto.
                            // Simplificação: Imagem 20x20mm no canto inferior direito da célula do prato

                            try {
                                doc.addImage(imgBase64, 'JPEG', cellX, data.cell.y + 10, 20, 20);
                            } catch (err) {
                                // Silent fail
                            }
                        }
                    }
                }
            });

            cursorY = (doc as any).lastAutoTable.finalY + 8;

            // Page break check basic logic would go here
            if (cursorY > 270) {
                doc.addPage();
                cursorY = 20;
            }
        }
        cursorY += 5; // Spacing between days
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado via FlexiBloom - Página ${p} de ${pages}`, 196, 285, { align: 'right' });
    }

    doc.save(`dieta-${data.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};
