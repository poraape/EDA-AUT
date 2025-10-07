import React, { useState, useCallback, useRef } from 'react';
import { type Dataset, type DatasetMeta } from '../types';
import { parseCSV } from '../services/csvParser';
import { UploadCloudIcon, FileIcon, XIcon } from './icons/Icons';
import JSZip from 'jszip';

// Minimal type for JSZipObject to avoid needing @types/jszip
type ZipObject = {
  name: string;
  dir: boolean;
  async: (type: 'blob') => Promise<Blob>;
};

interface SidebarProps {
  onDatasetLoaded: (dataset: Dataset) => void;
  onClear: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onDatasetLoaded, onClear }) => {
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesInZip, setFilesInZip] = useState<ZipObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setDatasetMeta(null);
    setFilesInZip([]);

    try {
      if (file.size > 200 * 1024 * 1024) { // 200MB limit
        throw new Error("O tamanho do arquivo excede o limite de 200MB.");
      }
      const parsedData = await parseCSV(file);
      const meta: DatasetMeta = {
        filename: file.name,
        n_rows: parsedData.rowCount,
        n_cols: parsedData.headers.length,
        columns: parsedData.headers,
      };
      setDatasetMeta(meta);
      onDatasetLoaded({ meta, sample: parsedData.sample, headers: parsedData.headers });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      setDatasetMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [onDatasetLoaded]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear all previous state when a new file is uploaded
    onClear();
    setDatasetMeta(null);
    setError(null);
    setFilesInZip([]);

    const fileNameLower = file.name.toLowerCase();

    if (fileNameLower.endsWith('.zip')) {
      setIsLoading(true);
      try {
        const zip = await JSZip.loadAsync(file);
        // Fix: Cast the result of Object.values to ZipObject[] to correctly type the zip entries.
        // This resolves type errors when accessing properties like 'dir', 'name', and 'async'.
        const csvFiles = (Object.values(zip.files) as ZipObject[]).filter(
          (zipEntry) => !zipEntry.dir && zipEntry.name.toLowerCase().endsWith('.csv')
        );

        if (csvFiles.length === 0) {
          throw new Error("O arquivo zip não contém arquivos CSV.");
        }

        if (csvFiles.length === 1) {
          const csvFile = csvFiles[0];
          const fileContent = await csvFile.async('blob');
          const csvAsFile = new File([fileContent], csvFile.name, { type: 'text/csv' });
          await processFile(csvAsFile);
        } else {
          setFilesInZip(csvFiles);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao ler o zip.');
        setDatasetMeta(null);
      } finally {
        setIsLoading(false);
      }
    } else if (fileNameLower.endsWith('.csv')) {
      await processFile(file);
    } else {
      setError("Formato de arquivo inválido. Por favor, envie um arquivo .csv ou .zip.");
    }
  }, [processFile, onClear]);

  const handleSelectFileFromZip = async (zipEntry: ZipObject) => {
    const fileContent = await zipEntry.async('blob');
    const csvAsFile = new File([fileContent], zipEntry.name, { type: 'text/csv' });
    await processFile(csvAsFile);
  };

  const handleClear = () => {
    setDatasetMeta(null);
    setError(null);
    setFilesInZip([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClear();
  };

  return (
    <aside className="w-80 bg-background border-r border-border-color p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-6 text-text-primary">Conjunto de Dados</h2>
        
        {filesInZip.length === 0 && (
          <div className="relative border-2 border-dashed border-border-color rounded-lg p-6 text-center transition-colors hover:border-primary">
            <UploadCloudIcon className="mx-auto h-12 w-12 text-text-secondary" />
            <p className="mt-2 text-sm text-text-secondary">
              Arraste e solte ou <label htmlFor="file-upload" className="font-semibold text-primary cursor-pointer hover:underline">clique para enviar</label>
            </p>
            <p className="text-xs text-gray-500 mt-1">Arquivos CSV ou ZIP de até 200MB</p>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept=".csv,.zip"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
          </div>
        )}

        {isLoading && <p className="mt-4 text-sm text-center text-primary">Analisando...</p>}
        {error && <p className="mt-4 text-sm text-center text-red-500">{error}</p>}

        {filesInZip.length > 0 && (
          <div className="mt-6 bg-secondary-background p-4 rounded-lg border border-border-color">
            <h3 className="font-semibold text-text-primary mb-3">Selecione um arquivo do ZIP:</h3>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {filesInZip.map(file => (
                <li key={file.name}>
                  <button
                    onClick={() => handleSelectFileFromZip(file)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate text-sm font-medium">{file.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {datasetMeta && (
          <div className="mt-6 bg-secondary-background p-4 rounded-lg border border-border-color">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="font-semibold text-text-primary truncate" title={datasetMeta.filename}>{datasetMeta.filename}</h3>
              </div>
              <button onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Limpar conjunto de dados">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <ul className="text-sm space-y-2 text-text-secondary">
              <li className="flex justify-between"><span>Linhas:</span> <span className="font-medium text-text-primary">{datasetMeta.n_rows.toLocaleString('pt-BR')}</span></li>
              <li className="flex justify-between"><span>Colunas:</span> <span className="font-medium text-text-primary">{datasetMeta.n_cols}</span></li>
            </ul>
            <details className="mt-3">
              <summary className="text-sm font-medium cursor-pointer text-text-primary">Nomes das Colunas</summary>
              <ul className="mt-2 text-xs text-text-secondary h-24 overflow-y-auto space-y-1 pr-2">
                {datasetMeta.columns.map((col, i) => <li key={i} className="truncate" title={col}>{col}</li>)}
              </ul>
            </details>
          </div>
        )}
      </div>
      <div className="text-center text-xs text-gray-400 mt-4">
        <p>&copy; 2024 AEGIS Labs</p>
      </div>
    </aside>
  );
};

export default Sidebar;