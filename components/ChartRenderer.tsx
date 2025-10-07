import React, { useEffect, useRef, useState } from 'react';
import vegaEmbed from 'vega-embed';
import { TooltipIcon } from './icons/Icons';

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
  const [selectedScheme, setSelectedScheme] = useState<string>(colorSchemes[0].value);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);

  useEffect(() => {
    if (chartContainer.current && spec) {
      // Deep copy the spec to avoid mutating the original prop
      const modifiedSpec = JSON.parse(JSON.stringify(spec));

      // Apply color scheme customization
      if (modifiedSpec.encoding?.color) {
        modifiedSpec.encoding.color.scale = {
          ...(modifiedSpec.encoding.color.scale || {}),
          scheme: selectedScheme,
        };
      }

      // Apply tooltip customization
      if (!showTooltips && modifiedSpec.encoding?.tooltip) {
        // To disable tooltips, we remove the tooltip encoding property
        delete modifiedSpec.encoding.tooltip;
      }
      
      const fullSpec = {
        ...modifiedSpec,
        data: { values: data },
        width: 'container',
        height: 'container',
        autosize: { type: 'fit', contains: 'padding' },
      };

      vegaEmbed(chartContainer.current, fullSpec, { actions: false })
        .catch(console.error);
    }
  }, [spec, data, selectedScheme, showTooltips]);

  return (
    <div className="chart-render-wrapper w-full bg-white rounded-md shadow-sm border border-border-color">
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
      </div>
      <div ref={chartContainer} className="w-full h-80 p-2"></div>
    </div>
  );
};

export default ChartRenderer;