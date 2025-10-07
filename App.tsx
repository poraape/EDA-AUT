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

  const handleExport = () => {
    if (!chatContainerRef.current || !dataset) return;

    // 1. Clonar o contêiner para não modificar a DOM ao vivo
    const containerClone = chatContainerRef.current.cloneNode(true) as HTMLDivElement;

    // 2. Encontrar todos os invólucros de renderização de gráficos no clone
    const chartWrappers = containerClone.querySelectorAll('.chart-render-wrapper');

    // 3. Substituir cada SVG por uma tag <img> com uma URL de dados
    chartWrappers.forEach(wrapper => {
      const svg = wrapper.querySelector('svg');
      if (svg) {
        // Serializar o SVG para uma string
        const svgString = new XMLSerializer().serializeToString(svg);
        // Criar uma URL de dados Base64 (robusta para caracteres especiais)
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        
        // Criar um elemento img
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.alt = 'Visualização de Gráfico';

        // Limpar o invólucro original e adicionar a nova imagem
        wrapper.innerHTML = '';
        wrapper.appendChild(img);
      }
    });

    // Obter o conteúdo HTML do clone modificado
    const content = containerClone.innerHTML;

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
            <style> body { background-color: #f5f7fb; font-family: 'Inter', sans-serif; padding: 2rem; } .prose { max-width: none; } </style>
        </head>
        <body>
            <h1 class="text-2xl font-bold mb-4 text-text-primary">Análise EDA: ${dataset.meta.filename}</h1>
            <div class="space-y-6">${content}</div>
        </body>
        </html>
    `;

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