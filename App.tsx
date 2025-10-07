
import React, { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { type Dataset, type ChatMessage } from './types';
import Header from './components/Header';

const App: React.FC = () => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatKey, setChatKey] = useState<number>(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    setMessages([]); // Limpa as mensagens ao carregar novo dataset
    setChatKey(prevKey => prevKey + 1);
  };

  const handleClear = () => {
    setDataset(null);
    setMessages([]);
    setChatKey(prevKey => prevKey + 1); // Reset chat interface as well
  };

  const handleExport = async () => {
    if (!chatContainerRef.current || !dataset) return;

    // 1. Create a deep clone to manipulate without affecting the live DOM
    const containerClone = chatContainerRef.current.cloneNode(true) as HTMLDivElement;

    // 2. Find original SVGs in the live DOM to get correct dimensions and styles
    // Fix: Explicitly type the querySelectorAll result to SVGElement to ensure
    // that the 'svg' variable inside the map is correctly typed, resolving
    // errors with `serializeToString` and `getBoundingClientRect`.
    // FIX: The generic on querySelectorAll wasn't correctly inferring the type, so we use a type assertion.
    const originalSvgs = Array.from(chatContainerRef.current.querySelectorAll('.chart-render-wrapper svg')) as SVGElement[];
    const clonedChartWrappers = Array.from(containerClone.querySelectorAll('.chart-render-wrapper'));

    // 3. Create promises to convert each SVG to a PNG data URL
    const conversionPromises = originalSvgs.map(svg => {
        return new Promise<string>((resolve, reject) => {
            const svgString = new XMLSerializer().serializeToString(svg);
            // This method is robust for handling Unicode characters in the SVG
            const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use the live SVG's rendered dimensions for accuracy
                const rect = svg.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Fill background with white to avoid transparent PNGs
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    reject(new Error('Não foi possível obter o contexto do canvas.'));
                }
            };
            img.onerror = () => {
                reject(new Error('Falha ao carregar o SVG como uma imagem.'));
            };
            img.src = dataUrl;
        });
    });

    try {
        // 4. Wait for all SVG-to-PNG conversions to complete
        const pngDataUrls = await Promise.all(conversionPromises);

        // 5. Replace chart wrappers in the CLONE with the generated PNG images
        clonedChartWrappers.forEach((wrapper, index) => {
            if (pngDataUrls[index]) {
                const pngImg = document.createElement('img');
                pngImg.src = pngDataUrls[index];
                pngImg.style.width = '100%';
                pngImg.style.height = 'auto';
                pngImg.alt = 'Visualização de Gráfico';

                // Clear the wrapper (which might contain controls) and append the image
                wrapper.innerHTML = ''; 
                wrapper.appendChild(pngImg);
            }
        });
    } catch (error) {
        console.error("Erro ao exportar gráficos:", error);
        // We can optionally show an error to the user here.
        // For now, we'll log it and proceed with exporting the text content.
    }

    // 6. Get the modified HTML content from the clone
    const content = containerClone.innerHTML;

    // 7. Assemble the full HTML document for export
    const tailwindCSS = `<script src="https://cdn.tailwindcss.com"></script>`;
    const customTailwindConfig = `<script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0f62fe',
                        background: '#ffffff',
                        'secondary-background': '#f5f7fb',
                        'text-primary': '#0b0f19',
                        'text-secondary': '#525252',
                        'border-color': '#e0e0e0',
                    },
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                },
            },
        }
    </script>`;
    const customFonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`;
    
    // 8. Add specific styles for tables rendered from Markdown to ensure they are styled correctly
    const customStyles = `
        body { background-color: #f5f7fb; font-family: 'Inter', sans-serif; padding: 2rem; } 
        .prose { max-width: none; }
        .prose table { width: 100%; border-collapse: collapse; margin-top: 1em; margin-bottom: 1em; font-size: 0.875rem; }
        .prose th, .prose td { border: 1px solid #e0e0e0; padding: 0.5rem 1rem; text-align: left; }
        .prose thead { background-color: #f5f7fb; border-bottom: 2px solid #e0e0e0; }
        .prose tbody tr:nth-child(even) { background-color: #fcfcfd; }
        .prose th { font-weight: 600; }
    `.replace(/\s\s+/g, ' '); // Minify the CSS string a bit

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Export da Análise - ${dataset.meta.filename}</title>
            ${tailwindCSS}
            ${customTailwindConfig}
            ${customFonts}
            <style>${customStyles}</style>
        </head>
        <body>
            <h1 class="text-2xl font-bold mb-4 text-text-primary">Análise EDA: ${dataset.meta.filename}</h1>
            <div class="space-y-6">${content}</div>
        </body>
        </html>
    `;

    // 9. Create a blob and trigger the download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-${dataset.meta.filename.replace(/\.csv$/, '')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="flex h-screen bg-secondary-background text-text-primary antialiased">
      <Sidebar onDatasetLoaded={handleDatasetLoaded} onClear={handleClear} />
      <main className="flex-1 flex flex-col h-screen">
        <Header 
          datasetName={dataset?.meta.filename}
          onExport={handleExport}
          canExport={messages.length > 0 && !!dataset}
        />
        <ChatInterface 
          key={chatKey} 
          dataset={dataset} 
          messages={messages}
          setMessages={setMessages}
          chatContainerRef={chatContainerRef}
        />
      </main>
    </div>
  );
};

export default App;
