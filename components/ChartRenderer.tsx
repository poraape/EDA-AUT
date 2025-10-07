import React, { useEffect, useRef, useState } from 'react';
import vegaEmbed from 'vega-embed';
import { TooltipIcon, DownloadIcon } from './icons/Icons';

interface ChartRendererProps {
  spec: any;
  data: Record<string, any>[];
}

const colorSchemes = [
  { name: 'Padrão (Tableau 10)', value: 'tableau10' },
  { name: 'Accent', value: 'accent' },
  { name: 'Category 20c', value: 'category20c' },
  { name: 'Dark 2', value: 'dark2' },
  { name: 'Paired', value: 'paired' },
];

const ChartRenderer: React.FC<ChartRendererProps> = ({ spec, data }) => {
  const chartContainer = useRef<HTMLDivElement>(null);
  const downloadButtonRef = useRef<HTMLDivElement>(null);

  const [selectedScheme, setSelectedScheme] = useState<string>(colorSchemes[0].value);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);
  const [isDownloadMenuOpen, setDownloadMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (chartContainer.current && spec) {
      const modifiedSpec = JSON.parse(JSON.stringify(spec));

      if (modifiedSpec.encoding?.color) {
        modifiedSpec.encoding.color.scale = {
          ...(modifiedSpec.encoding.color.scale || {}),
          scheme: selectedScheme,
        };
      }

      if (!showTooltips && modifiedSpec.encoding?.tooltip) {
        delete modifiedSpec.encoding.tooltip;
      }
      
      const fullSpec = {
        ...modifiedSpec,
        data: { values: data },
        width: 'container',
        height: 'container',
        autosize: { type: 'fit', contains: 'padding' },
      };

      vegaEmbed(chartContainer.current, fullSpec, { actions: false }).catch(console.error);
    }
  }, [spec, data, selectedScheme, showTooltips]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
            setDownloadMenuOpen(false);
        }
    };
    if (isDownloadMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  const getStyledSvg = (svgElement: SVGElement): SVGElement => {
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      let allCss = '';
      try {
          for (const sheet of Array.from(document.styleSheets)) {
              try {
                  for (const rule of Array.from(sheet.cssRules)) {
                      allCss += rule.cssText;
                  }
              } catch (e) {
                  console.warn("Não foi possível ler as regras CSS da folha de estilo:", sheet.href, e);
              }
          }
      } catch (e) {
          console.error("Erro ao ler as folhas de estilo para exportação de SVG:", e);
      }
      
      const fontCss = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); body { font-family: 'Inter', sans-serif; }`;
      
      let defs = svgClone.querySelector('defs');
      if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svgClone.insertBefore(defs, svgClone.firstChild);
      }
      
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = fontCss + allCss;
      defs.appendChild(styleElement);

      const rect = svgElement.getBoundingClientRect();
      svgClone.setAttribute('width', `${rect.width}`);
      svgClone.setAttribute('height', `${rect.height}`);
      
      return svgClone;
  };

  const getFilename = (extension: string) => {
      const title = spec.title?.text || 'grafico';
      return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.${extension}`;
  };

  const handleDownloadSVG = () => {
      if (!chartContainer.current) return;
      const svg = chartContainer.current.querySelector('svg');
      if (!svg) {
          console.error("Elemento SVG não encontrado para download.");
          return;
      }

      const styledSvg = getStyledSvg(svg);
      const svgString = new XMLSerializer().serializeToString(styledSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename('svg');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadMenuOpen(false);
  };

  const handleDownloadPNG = () => {
    if (!chartContainer.current) return;
    const svg = chartContainer.current.querySelector('svg');
    if (!svg) {
        console.error("Elemento SVG não encontrado para download.");
        return;
    }
    
    const styledSvg = getStyledSvg(svg);
    const svgString = new XMLSerializer().serializeToString(styledSvg);
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const rect = svg.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const pngUrl = canvas.toDataURL('image/png');
            
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = getFilename('png');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            console.error("Não foi possível obter o contexto do canvas.");
        }
        setDownloadMenuOpen(false);
    };
    img.onerror = () => {
        console.error("Falha ao carregar o SVG estilizado como uma imagem.");
        setDownloadMenuOpen(false);
    };
    img.src = dataUrl;
  };

  return (
    <div className="chart-render-wrapper w-full bg-background rounded-md shadow-sm border border-border-color">
      <div className="flex items-center justify-end gap-3 p-1.5 bg-secondary-background/50 border-b border-border-color">
        <div className="relative">
          <select
            value={selectedScheme}
            onChange={(e) => setSelectedScheme(e.target.value)}
            className="text-xs appearance-none bg-transparent border border-border-color rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary pr-6"
            aria-label="Selecionar esquema de cores"
          >
            {colorSchemes.map((scheme) => (
              <option key={scheme.value} value={scheme.value}>
                {scheme.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>

        <button
          onClick={() => setShowTooltips(!showTooltips)}
          className={`p-1.5 border rounded-md transition-colors ${
            showTooltips
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-transparent text-text-secondary hover:bg-gray-200 border-border-color'
          }`}
          title={showTooltips ? 'Desativar Tooltips' : 'Ativar Tooltips'}
        >
          <TooltipIcon className="w-4 h-4" />
        </button>

        <div className="relative" ref={downloadButtonRef}>
          <button
            onClick={() => setDownloadMenuOpen(prev => !prev)}
            className="p-1.5 border rounded-md transition-colors bg-transparent text-text-secondary hover:bg-gray-200 border-border-color"
            title="Baixar Gráfico"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
          {isDownloadMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-background border border-border-color rounded-md shadow-lg z-20">
              <ul className="py-1">
                <li>
                  <button onClick={handleDownloadPNG} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-secondary-background">
                    Salvar como PNG
                  </button>
                </li>
                <li>
                  <button onClick={handleDownloadSVG} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-secondary-background">
                    Salvar como SVG
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <div ref={chartContainer} className="w-full h-80 p-2"></div>
    </div>
  );
};

export default ChartRenderer;