import React, { useState } from 'react';
import { Sliders, Copy, Check, Search, FileSpreadsheet, ListFilter, AlertCircle } from 'lucide-react';
import { ExtractedProduct } from '../types/product.ts';

interface TechnicalSpecsWindowProps {
  product: ExtractedProduct;
  onCopySuccess: (text: string) => void;
}

export const TechnicalSpecsWindow: React.FC<TechnicalSpecsWindowProps> = ({
  product,
  onCopySuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedType, setCopiedType] = useState<'text' | 'tsv' | null>(null);

  const specs = product.specifications || [];

  const filteredSpecs = specs.filter(
    (s) =>
      s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyText = () => {
    const lines = specs.map((s) => `• ${s.key}: ${s.value}`);
    const content = `📋 ESPECIFICACIONES TÉCNICAS - ${product.title}
Marca: ${product.brand} | Modelo: ${product.model || 'Estándar'}
--------------------------------------------------------
${lines.join('\n')}
--------------------------------------------------------`;

    navigator.clipboard.writeText(content);
    setCopiedType('text');
    onCopySuccess(`¡${specs.length} especificaciones copiadas como texto!`);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyTsv = () => {
    // Tab-separated format for pasting directly into Excel / Google Sheets
    const header = `Especificación\tValor\n`;
    const rows = specs.map((s) => `${s.key}\t${s.value}`).join('\n');
    navigator.clipboard.writeText(header + rows);
    setCopiedType('tsv');
    onCopySuccess('¡Especificaciones copiadas en formato Excel / Hoja de cálculo!');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Window Header */}
      <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-semibold text-sm text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Ventana: Especificaciones Técnicas ({specs.length} atributos)
          </span>
        </div>

        {/* Copy Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer border border-slate-700 shadow-sm"
            title="Copiar para Excel / Google Sheets (Tabulado)"
          >
            {copiedType === 'tsv' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">¡Copiado Excel!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiar para Excel</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xs font-semibold transition cursor-pointer border border-slate-600 shadow-sm"
            title="Copiar lista de especificaciones técnicas"
          >
            {copiedType === 'text' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Especificaciones</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por atributo (ej. Memoria, Color, Dimensiones)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Mostrando <b className="text-white font-bold">{filteredSpecs.length}</b> de {specs.length} especificaciones
        </div>
      </div>

      {/* Structured Table */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        {filteredSpecs.length > 0 ? (
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-1/3 bg-slate-950/40 rounded-l-lg">Especificación</th>
                <th className="py-3 px-4 w-2/3 bg-slate-950/40 rounded-r-lg">Valor / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSpecs.map((spec, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3 px-4 font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors align-top">
                    {spec.key}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-normal leading-relaxed align-top">
                    {spec.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6 text-slate-600" />
            <span>No se encontraron especificaciones con el término de búsqueda.</span>
          </div>
        )}
      </div>
    </div>
  );
};
