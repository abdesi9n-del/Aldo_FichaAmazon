import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Star, ShieldCheck, Truck, Tag, Package, Building2, Eye } from 'lucide-react';
import { ExtractedProduct } from '../types/product.ts';

interface GeneralInfoCardProps {
  product: ExtractedProduct;
  onCopySuccess: (text: string) => void;
  onOpenImageLightbox: (index: number) => void;
}

export const GeneralInfoCard: React.FC<GeneralInfoCardProps> = ({
  product,
  onCopySuccess,
  onOpenImageLightbox,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: product.currency || 'MXN',
  }).format(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: product.currency || 'MXN',
      }).format(product.originalPrice)
    : null;

  const handleCopy = () => {
    const textToCopy = `📦 FICHA TÉCNICA GENERAL DEL PRODUCTO
----------------------------------------
🏷️ Producto: ${product.title}
🏢 Marca: ${product.brand} ${product.model ? `| Modelo: ${product.model}` : ''}
💰 Precio: ${formattedPrice} ${product.originalPrice ? `(Antes: ${formattedOriginalPrice} | ${product.discountPercentage}% OFF)` : ''}
🆔 SKU / ASIN: ${product.skuOrAsin}
📦 Condición: ${product.condition}
✅ Disponibilidad: ${product.availability}
⭐ Calificación: ${product.rating || '4.8'} / 5.0 ${product.reviewsCount ? `(${product.reviewsCount} opiniones)` : ''}
🚚 Vendedor / Envío: ${product.seller}
🛡️ Garantía: ${product.warranty || 'Garantía oficial'}
🔗 Enlace: ${product.url}
----------------------------------------`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onCopySuccess('¡Ficha General copiada al portapapeles!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Window Title & Action Bar */}
      <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-semibold text-sm text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-400" />
            Ventana: Ficha General del Producto
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xs font-semibold transition cursor-pointer border border-slate-600 shadow-sm"
          title="Copiar resumen general al portapapeles"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Información General</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Main Product Image preview with zoom click */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center">
            <div
              onClick={() => onOpenImageLightbox(0)}
              className="group relative w-full aspect-square bg-slate-950/60 rounded-2xl border border-slate-800 p-4 flex items-center justify-center cursor-pointer overflow-hidden shadow-inner hover:border-orange-500/50 transition-all duration-300"
              title="Clic para ver en pantalla completa"
            >
              {product.mainImage ? (
                <img
                  src={product.mainImage}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 select-none"
                />
              ) : (
                <div className="text-slate-600 text-sm">Sin imagen disponible</div>
              )}

              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-medium text-xs backdrop-blur-[2px]">
                <Eye className="w-4 h-4" />
                <span>Ver en alta resolución</span>
              </div>

              {/* Source tag badge */}
              <div className="absolute top-3 left-3">
                {product.source === 'amazon' && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500 text-slate-950 shadow-md">
                    Amazon MX
                  </span>
                )}
                {product.source === 'mercadolibre' && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
                    Mercado Libre
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span>Identificador:</span>
              <code className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 text-[10px]">
                {product.skuOrAsin}
              </code>
            </p>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 lg:col-span-8 space-y-4">
            {/* Brand & Model Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold uppercase tracking-wider">
                {product.brand || 'Marca Oficial'}
              </span>
              {product.model && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                  Mod: {product.model}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {product.condition}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug tracking-tight">
              {product.title}
            </h1>

            {/* Rating Stars & Reviews */}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-bold text-white">{product.rating || 4.8}</span>
              </div>
              <span className="text-slate-600">•</span>
              {product.reviewsCount ? (
                <span className="text-slate-400">
                  {product.reviewsCount.toLocaleString('es-MX')} calificaciones
                </span>
              ) : (
                <span className="text-slate-400">Excelente reputación</span>
              )}
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-medium">{product.availability}</span>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-baseline gap-3">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                {formattedPrice}
              </span>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                {product.currency}
              </span>

              {formattedOriginalPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base text-slate-500 line-through">
                    {formattedOriginalPrice}
                  </span>
                  {product.discountPercentage && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                      {product.discountPercentage}% OFF
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Badges / Logistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Envío & Vendedor</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                    {product.seller}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">Garantía</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                    {product.warranty || 'Garantía del fabricante / Devolución asegurada'}
                  </div>
                </div>
              </div>
            </div>

            {/* Source Link */}
            <div className="pt-2">
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 transition"
              >
                <span>Ver publicación original en tienda</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Highlights summary pills if available */}
        {product.bulletPoints && product.bulletPoints.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Puntos Destacados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {product.bulletPoints.slice(0, 4).map((bp, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                >
                  <Tag className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{bp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
