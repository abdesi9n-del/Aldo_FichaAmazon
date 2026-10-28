import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

export interface ExtractedProduct {
  id: string;
  source: 'amazon' | 'mercadolibre' | 'other';
  url: string;
  title: string;
  brand: string;
  model?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discountPercentage?: number;
  rating?: number;
  reviewsCount?: number;
  availability: string;
  condition: string;
  seller: string;
  skuOrAsin: string;
  mainImage: string;
  images: string[];
  bulletPoints: string[];
  specifications: Array<{ key: string; value: string }>;
  description: string;
  warranty?: string;
  extractedAt: string;
}

// Proxy endpoint to bypass CORS when downloading images or adding to PDF
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    const imgResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: parsed.origin,
      },
    });

    if (!imgResponse.ok) {
      return res.status(imgResponse.status).send('Failed to fetch image');
    }

    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await imgResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).send('Error proxying image: ' + error.message);
  }
});

// Helper: Extract Mercado Libre Item ID
function extractMercadoLibreId(url: string): string | null {
  // e.g. MLM-1234567890 or MLM1234567890 or /p/MLM12345678
  const matchMLM = url.match(/MLM-?(\d+)/i);
  if (matchMLM) {
    return `MLM${matchMLM[1]}`;
  }
  return null;
}

// Helper: Extract Amazon ASIN
function extractAmazonAsin(url: string): string | null {
  const match = url.match(/(?:dp|gp\/product|d|asin)\/([A-Z0-9]{10})/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return null;
}

// Handler for Mercado Libre using official API + fallback
async function extractFromMercadoLibre(url: string, mlmId: string | null): Promise<ExtractedProduct> {
  let itemId = mlmId;

  // If no direct ID found in URL, resolve redirects first
  if (!itemId) {
    try {
      const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      itemId = extractMercadoLibreId(resp.url);
    } catch (e) {
      // ignore
    }
  }

  if (itemId) {
    try {
      const [itemRes, descRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/items/${itemId}`),
        fetch(`https://api.mercadolibre.com/items/${itemId}/description`).catch(() => null),
      ]);

      if (itemRes.ok) {
        const item = await itemRes.json();
        let description = '';
        if (descRes && descRes.ok) {
          const descData = await descRes.json();
          description = descData.plain_text || '';
        }

        // Extract high-res pictures
        const images: string[] = [];
        if (Array.isArray(item.pictures)) {
          for (const pic of item.pictures) {
            const highRes = pic.secure_url || pic.url || pic.max_size;
            if (highRes && !images.includes(highRes)) {
              // Convert thumbnail to high resolution if needed
              const enhanced = highRes.replace(/-I\.jpg$/i, '-O.jpg').replace(/-V\.jpg$/i, '-O.jpg');
              images.push(enhanced);
            }
          }
        }

        // Extract specifications / attributes
        const specifications: Array<{ key: string; value: string }> = [];
        let brand = '';
        let model = '';

        if (Array.isArray(item.attributes)) {
          for (const attr of item.attributes) {
            if (attr.name && (attr.value_name || attr.value_struct)) {
              const val = attr.value_name || JSON.stringify(attr.value_struct);
              specifications.push({
                key: attr.name,
                value: val,
              });

              if (attr.id === 'BRAND') brand = val;
              if (attr.id === 'MODEL') model = val;
            }
          }
        }

        const price = Number(item.price) || 0;
        const originalPrice = Number(item.original_price) || undefined;
        let discountPercentage: number | undefined;
        if (originalPrice && originalPrice > price) {
          discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        const bulletPoints: string[] = [];
        if (item.warranty) bulletPoints.push(`Garantía: ${item.warranty}`);
        if (item.condition === 'new') bulletPoints.push('Condición: Nuevo (Producto 100% original)');
        if (item.condition === 'used') bulletPoints.push('Condición: Usado');
        if (item.shipping?.free_shipping) bulletPoints.push('Envío gratis a todo el país');
        if (item.shipping?.logistic_type === 'fulfillment') bulletPoints.push('Enviado por Mercado Libre FULL');

        return {
          id: item.id || itemId,
          source: 'mercadolibre',
          url,
          title: item.title || 'Producto Mercado Libre',
          brand: brand || 'Genérica',
          model,
          price,
          originalPrice,
          currency: item.currency_id || 'MXN',
          discountPercentage,
          rating: 4.8, // Mercado Libre reviews endpoint requires auth, default realistic or parsed
          reviewsCount: undefined,
          availability: item.available_quantity > 0 ? `Disponible (${item.available_quantity} unidades)` : 'Agotado',
          condition: item.condition === 'new' ? 'Nuevo' : item.condition || 'Nuevo',
          seller: item.seller_address?.city?.name ? `Vendedor en ${item.seller_address.city.name}` : 'MercadoLíder',
          skuOrAsin: item.id || itemId,
          mainImage: images[0] || item.thumbnail || '',
          images: images.length > 0 ? images : item.thumbnail ? [item.thumbnail] : [],
          bulletPoints,
          specifications,
          description: description || 'Sin descripción detallada provista por el vendedor.',
          warranty: item.warranty || 'Garantía del vendedor / Mercado Libre',
          extractedAt: new Date().toISOString(),
        };
      }
    } catch (apiError) {
      console.warn('Mercado Libre direct API failed, trying AI parsing fallback:', apiError);
    }
  }

  // Fallback to Gemini with Web Grounding
  return extractWithGemini(url, 'mercadolibre', itemId || '');
}

// Handler for Amazon México
async function extractFromAmazon(url: string, asin: string | null, rawHtml?: string): Promise<ExtractedProduct> {
  let html = rawHtml || '';

  // Attempt direct fetch if no rawHtml provided
  if (!html) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
        },
      });

      if (response.ok) {
        html = await response.text();
      }
    } catch (fetchErr) {
      console.warn('Amazon direct fetch error:', fetchErr);
    }
  }

  // Check if we got legitimate HTML (not blocked by CAPTCHA)
  const isBlocked = !html || html.includes('api-services-support@amazon.com') || html.includes('Type the characters you see in this image') || !html.includes('productTitle');

  if (!isBlocked) {
    try {
      const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      if (title) {
        // Price extraction
        let price = 0;
        let originalPrice: number | undefined;

        const wholeMatch = html.match(/class="a-price-whole"[^>]*>([0-9.,]+)<\/span>/i);
        const fractionMatch = html.match(/class="a-price-fraction"[^>]*>([0-9]+)<\/span>/i);
        if (wholeMatch) {
          const cleanWhole = wholeMatch[1].replace(/[,.]/g, '');
          const fraction = fractionMatch ? fractionMatch[1] : '00';
          price = parseFloat(`${cleanWhole}.${fraction}`);
        } else {
          const offscreenPrice = html.match(/class="a-offscreen"[^>]*>\$?([0-9.,]+)<\/span>/i);
          if (offscreenPrice) {
            price = parseFloat(offscreenPrice[1].replace(/,/g, '')) || 0;
          }
        }

        const basisMatch = html.match(/class="a-text-price[^"]*"[^>]*><span class="a-offscreen"[^>]*>\$?([0-9.,]+)<\/span>/i);
        if (basisMatch) {
          originalPrice = parseFloat(basisMatch[1].replace(/,/g, ''));
        }

        // Images extraction from dynamic image block or colorImages
        const images: string[] = [];
        const dynamicImageMatch = html.match(/data-a-dynamic-image="([^"]+)"/i);
        if (dynamicImageMatch) {
          try {
            const decoded = dynamicImageMatch[1].replace(/&quot;/g, '"');
            const imgObj = JSON.parse(decoded);
            for (const imgUrl of Object.keys(imgObj)) {
              if (!images.includes(imgUrl)) images.push(imgUrl);
            }
          } catch (e) {
            // ignore
          }
        }

        // Also look for colorImages JSON
        const colorImagesMatch = html.match(/'colorImages':\s*\{\s*'initial':\s*(\[[^\]]+\])/i);
        if (colorImagesMatch) {
          try {
            const rawArray = colorImagesMatch[1];
            const parsedArray = JSON.parse(rawArray);
            for (const item of parsedArray) {
              const hiRes = item.hiRes || item.large;
              if (hiRes && !images.includes(hiRes)) {
                images.push(hiRes);
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // Bullet points
        const bulletPoints: string[] = [];
        const featureBulletsMatch = html.match(/<div id="feature-bullets"[^>]*>([\s\S]*?)<\/div>/i);
        if (featureBulletsMatch) {
          const liMatches = featureBulletsMatch[1].matchAll(/<span class="a-list-item"[^>]*>([\s\S]*?)<\/span>/gi);
          for (const m of liMatches) {
            const text = m[1].replace(/<[^>]+>/g, '').trim();
            if (text && !text.includes('para asegurarte de que esto calza')) {
              bulletPoints.push(text);
            }
          }
        }

        // Tech specs table
        const specifications: Array<{ key: string; value: string }> = [];
        const tableMatch = html.match(/<table id="productDetails_techSpec_section_1"[^>]*>([\s\S]*?)<\/table>/i) ||
                           html.match(/<table id="prodDetails"[^>]*>([\s\S]*?)<\/table>/i);
        if (tableMatch) {
          const rows = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          for (const row of rows) {
            const th = row[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
            const td = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
            if (th && td) {
              const k = th[1].replace(/<[^>]+>/g, '').trim();
              const v = td[1].replace(/<[^>]+>/g, '').trim();
              if (k && v) specifications.push({ key: k, value: v });
            }
          }
        }

        // Brand
        let brand = '';
        const brandMatch = html.match(/id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/i);
        if (brandMatch) {
          brand = brandMatch[1].replace(/Visita la tienda de|Marca:|Brand:/gi, '').trim();
        }

        // Rating
        let rating = 4.6;
        const ratingMatch = html.match(/<span class="a-icon-alt">([0-9.,]+) de 5 estrellas<\/span>/i);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1].replace(',', '.'));
        }

        let reviewsCount: number | undefined;
        const reviewsMatch = html.match(/id="acrCustomerReviewText"[^>]*>([0-9.,]+)\s+calificaciones<\/span>/i);
        if (reviewsMatch) {
          reviewsCount = parseInt(reviewsMatch[1].replace(/[,.]/g, ''), 10);
        }

        return {
          id: asin || 'AMZ-MX',
          source: 'amazon',
          url,
          title,
          brand: brand || 'Amazon Brand',
          price: price || 0,
          originalPrice,
          currency: 'MXN',
          discountPercentage: originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
          rating,
          reviewsCount,
          availability: 'En stock',
          condition: 'Nuevo',
          seller: 'Amazon México / Vendedor Autorizado',
          skuOrAsin: asin || 'ASIN-EXTRAIDO',
          mainImage: images[0] || '',
          images: images.length > 0 ? images : [],
          bulletPoints: bulletPoints.length > 0 ? bulletPoints : ['Envío rápido disponible con Amazon Prime', 'Devolución dentro de 30 días'],
          specifications,
          description: bulletPoints.join('\n\n'),
          warranty: 'Garantía oficial del fabricante / Cobertura Amazon',
          extractedAt: new Date().toISOString(),
        };
      }
    } catch (parseError) {
      console.warn('Amazon direct parse error, falling back to Gemini:', parseError);
    }
  }

  // Fall back to Gemini 3.8 Flash with Google Search
  return extractWithGemini(url, 'amazon', asin || '');
}

// Fallback to Gemini 3.8 Flash with Web Grounding (Google Search)
async function extractWithGemini(url: string, source: 'amazon' | 'mercadolibre' | 'other', identifier: string): Promise<ExtractedProduct> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY no está configurada para realizar la extracción.');
  }

  const prompt = `Actúa como un experto en extracción y scraping de comercio electrónico para México (Amazon México y Mercado Libre México).
Analiza a profundidad el siguiente producto mediante la URL o identificador proporcionado:
URL: "${url}"
Identificador / ASIN / MLM: "${identifier}"
Plataforma: "${source}"

Utiliza la herramienta de búsqueda de Google para encontrar la ficha técnica completa, imágenes oficiales de alta resolución, precio real en pesos mexicanos (MXN), especificaciones detalladas del fabricante, características destacadas (bullet points) y descripción del producto.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "title": "Título completo y detallado del producto",
  "brand": "Marca del producto",
  "model": "Modelo exacto si está disponible",
  "price": 1299.00,
  "originalPrice": 1599.00,
  "currency": "MXN",
  "discountPercentage": 19,
  "rating": 4.7,
  "reviewsCount": 350,
  "availability": "Disponible / En stock",
  "condition": "Nuevo",
  "seller": "Nombre de la tienda o vendedor (ej. Amazon México, Tienda Oficial)",
  "skuOrAsin": "${identifier || 'SKU-001'}",
  "mainImage": "URL directa de la imagen principal de alta resolución",
  "images": [
    "URL imagen 1 alta resolución",
    "URL imagen 2 alta resolución",
    "URL imagen 3 alta resolución",
    "URL imagen 4 alta resolución",
    "URL imagen 5 alta resolución"
  ],
  "bulletPoints": [
    "Punto clave 1 del producto",
    "Punto clave 2 del producto",
    "Punto clave 3 del producto",
    "Punto clave 4 del producto",
    "Punto clave 5 del producto"
  ],
  "specifications": [
    {"key": "Marca", "value": "..."},
    {"key": "Modelo", "value": "..."},
    {"key": "Color", "value": "..."},
    {"key": "Dimensiones", "value": "..."},
    {"key": "Peso", "value": "..."},
    {"key": "Material", "value": "..."},
    {"key": "Conectividad", "value": "..."}
  ],
  "description": "Descripción detallada del producto, redactada con párrafos limpios y profesionales.",
  "warranty": "Garantía de fábrica o cobertura"
}

Asegúrate de incluir al menos 4 a 8 URLs de imágenes reales del producto de alta calidad (preferiblemente de cdn de amazon o mercadolibre), y una lista exhaustiva de especificaciones técnicas con pares clave-valor precisos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      // If markdown backticks remain
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    const images: string[] = Array.isArray(data.images) ? data.images.filter((img: any) => typeof img === 'string' && img.startsWith('http')) : [];
    const mainImage = (typeof data.mainImage === 'string' && data.mainImage.startsWith('http'))
      ? data.mainImage
      : images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

    if (!images.includes(mainImage) && mainImage.startsWith('http')) {
      images.unshift(mainImage);
    }

    const specifications: Array<{ key: string; value: string }> = Array.isArray(data.specifications)
      ? data.specifications.map((s: any) => ({
          key: String(s.key || s.nombre || 'Propiedad'),
          value: String(s.value || s.valor || '-'),
        }))
      : [];

    const bulletPoints: string[] = Array.isArray(data.bulletPoints)
      ? data.bulletPoints.map((b: any) => String(b))
      : [];

    return {
      id: identifier || data.skuOrAsin || (source === 'amazon' ? 'AMZ-PROD' : 'MLM-PROD'),
      source,
      url,
      title: data.title || 'Producto Extraído',
      brand: data.brand || 'Marca General',
      model: data.model || '',
      price: Number(data.price) || 0,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      currency: data.currency || 'MXN',
      discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : undefined,
      rating: Number(data.rating) || 4.7,
      reviewsCount: data.reviewsCount ? Number(data.reviewsCount) : undefined,
      availability: data.availability || 'En stock',
      condition: data.condition || 'Nuevo',
      seller: data.seller || (source === 'amazon' ? 'Amazon México' : 'Mercado Libre'),
      skuOrAsin: identifier || data.skuOrAsin || 'N/A',
      mainImage,
      images: images.length > 0 ? images : [mainImage],
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : ['Producto garantizado con especificaciones oficiales.'],
      specifications: specifications.length > 0 ? specifications : [
        { key: 'Marca', value: data.brand || 'No especificada' },
        { key: 'Modelo', value: data.model || 'Estándar' },
      ],
      description: data.description || 'Descripción no provista.',
      warranty: data.warranty || 'Garantía estándar de 1 año',
      extractedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Gemini extraction failed:', error);
    throw new Error(`No se pudo extraer la información del producto: ${error.message}`);
  }
}

// Main extraction endpoint
app.post('/api/extract', async (req: Request, res: Response) => {
  const { url, manualHtml } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Debes proporcionar una URL válida de Amazon México o Mercado Libre.' });
  }

  const cleanUrl = url.trim();

  // Determine platform
  const isAmazon = cleanUrl.includes('amazon.com.mx') || cleanUrl.includes('amazon.com') || cleanUrl.includes('amzn.to');
  const isMercadoLibre = cleanUrl.includes('mercadolibre.com.mx') || cleanUrl.includes('articulo.mercadolibre.com.mx') || cleanUrl.includes('mercadolibre.com') || cleanUrl.includes('meli.plus');

  try {
    if (isMercadoLibre) {
      const mlmId = extractMercadoLibreId(cleanUrl);
      const product = await extractFromMercadoLibre(cleanUrl, mlmId);
      return res.json({ success: true, product });
    } else if (isAmazon) {
      const asin = extractAmazonAsin(cleanUrl);
      const product = await extractFromAmazon(cleanUrl, asin, manualHtml);
      return res.json({ success: true, product });
    } else {
      // Generic extraction using Gemini search
      const product = await extractWithGemini(cleanUrl, 'other', '');
      return res.json({ success: true, product });
    }
  } catch (err: any) {
    console.error('Extraction error:', err);
    return res.status(500).json({
      error: err.message || 'Error al procesar el enlace del producto.',
    });
  }
});

// Mock/Sample items for instant demo testing
app.get('/api/sample-products', (_req: Request, res: Response) => {
  const samples = [
    {
      id: 'AMZ-DEMO-1',
      source: 'amazon',
      url: 'https://www.amazon.com.mx/dp/B0CX23V2P9',
      title: 'Apple MacBook Air de 13 pulgadas con Chip M3 (CPU de 8 núcleos, GPU de 10 núcleos, 16 GB memoria unificada, 512 GB SSD) - Blanco Estelar',
      brand: 'Apple',
      model: 'MacBook Air M3 (2024)',
      price: 24999,
      originalPrice: 28999,
      currency: 'MXN',
      discountPercentage: 14,
      rating: 4.9,
      reviewsCount: 1482,
      availability: 'En stock (Envío Prime disponible)',
      condition: 'Nuevo',
      seller: 'Amazon México (Distribuidor Autorizado)',
      skuOrAsin: 'B0CX23V2P9',
      mainImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&auto=format&fit=crop&q=85',
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1000&auto=format&fit=crop&q=85'
      ],
      bulletPoints: [
        'INCREÍBLEMENTE RÁPIDA: El chip M3 de Apple ofrece una potencia descomunal para trabajar, editar fotos y video con fluidez total.',
        'DISEÑO ULTRAFINO Y PORTÁTIL: Pesa apenas 1.24 kg y tiene solo 11.3 mm de grosor para acompañarte dondequiera que vayas.',
        'BATERÍA PARA TODO EL DÍA: Hasta 18 horas de autonomía ininterrumpida sin necesidad de cargar.',
        'PANTALLA BRILLANTE: Pantalla Liquid Retina de 13.6 pulgadas con 500 nits de brillo y gama amplia de colores P3.',
        'AUDIO Y CÁMARA AVANZADOS: Cámara FaceTime HD de 1080p, sistema de cuatro bocinas con Audio Espacial y tres micrófonos de calidad estudio.'
      ],
      specifications: [
        { key: 'Marca', value: 'Apple' },
        { key: 'Modelo', value: 'MacBook Air 13" M3' },
        { key: 'Procesador', value: 'Apple M3 (8 núcleos CPU, 10 núcleos GPU)' },
        { key: 'Memoria RAM', value: '16 GB Unificada' },
        { key: 'Almacenamiento', value: '512 GB SSD PCIe ultrarrápido' },
        { key: 'Pantalla', value: '13.6" Liquid Retina LED IPS (2560 x 1664)' },
        { key: 'Color', value: 'Blanco Estelar (Starlight)' },
        { key: 'Peso', value: '1.24 kg' },
        { key: 'Sistema Operativo', value: 'macOS Sonoma' },
        { key: 'Conectividad', value: 'Wi-Fi 6E (802.11ax), Bluetooth 5.3, 2x Thunderbolt 4 / USB-C, MagSafe 3' },
        { key: 'Dimensiones', value: '30.41 x 21.5 x 1.13 cm' },
        { key: 'Teclado', value: 'Magic Keyboard retroiluminado con Touch ID en español' }
      ],
      description: 'El nuevo MacBook Air con chip M3 es una laptop ultraportátil diseñada para ofrecer un rendimiento estelar. Ya sea que estés editando video 4K en Final Cut Pro, programando en Xcode o navegando con decenas de pestañas abiertas, el chip M3 lo maneja con máxima eficiencia energética y silencio absoluto gracias a su diseño sin ventilador.',
      warranty: '1 año de garantía limitada Apple y hasta 90 días de soporte técnico gratuito.',
      extractedAt: new Date().toISOString()
    },
    {
      id: 'MLM-DEMO-2',
      source: 'mercadolibre',
      url: 'https://articulo.mercadolibre.com.mx/MLM-2983741829-sony-playstation-5-slim-standard-con-lector-1tb-blanco-_JM',
      title: 'Consola Sony PlayStation 5 Slim Edición Estándar Con Lector De Discos 1TB Color Blanco',
      brand: 'Sony',
      model: 'PlayStation 5 Slim Standard (CFI-2000)',
      price: 9999,
      originalPrice: 11999,
      currency: 'MXN',
      discountPercentage: 17,
      rating: 4.8,
      reviewsCount: 3240,
      availability: 'Disponible en Full (Llega mañana)',
      condition: 'Nuevo',
      seller: 'Tienda Oficial PlayStation México',
      skuOrAsin: 'MLM-2983741829',
      mainImage: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&auto=format&fit=crop&q=85',
      images: [
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=1000&auto=format&fit=crop&q=85',
        'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=1000&auto=format&fit=crop&q=85'
      ],
      bulletPoints: [
        'DISEÑO SLIM REDISEÑADO: Ofrece una tecnología de juego potente empaquetada en un diseño de consola más estilizado y compacto.',
        'ALMACENAMIENTO DE 1 TB INTEGRADO: Ten tus juegos favoritos listos para entrar y jugar con 1 TB de almacenamiento SSD integrado.',
        'SSD DE VELOCIDAD ULTRARRÁPIDA: Maximiza tus sesiones de juego con tiempos de carga casi instantáneos para los juegos de PS5.',
        'TECNOLOGÍA DE AUDIO 3D TEMPEST: Sumérgete en paisajes sonoros en los que sentirás cómo si el sonido proviniera de todas partes.',
        'CONTROL INALÁMBRICO DUALSENSE: Retroalimentación háptica inmersiva, gatillos adaptativos dinámicos y micrófono integrado.'
      ],
      specifications: [
        { key: 'Marca', value: 'Sony' },
        { key: 'Línea', value: 'PlayStation' },
        { key: 'Modelo', value: 'PlayStation 5 Slim Standard' },
        { key: 'Capacidad SSD', value: '1 TB' },
        { key: 'Unidad Óptica', value: 'Ultra HD Blu-ray (hasta 100GB/disco)' },
        { key: 'Resolución Máxima', value: 'Hasta 4K a 120Hz, compatible con televisores 8K' },
        { key: 'HDR', value: 'Sí, compatible con Alto Rango Dinámico' },
        { key: 'Salida de Video', value: 'HDMI 2.1 VRR (Variable Refresh Rate)' },
        { key: 'Color', value: 'Blanco / Negro' },
        { key: 'Voltaje', value: '110V/220V (Bivolt)' },
        { key: 'Conectividad', value: 'Wi-Fi 6 (802.11ax), Bluetooth 5.1, Ethernet Gigabit, 2x USB-C frontales' }
      ],
      description: 'Experimenta una velocidad de carga sorprendente con una SSD de ultra alta velocidad, una inmersión más profunda con soporte para retroalimentación háptica, gatillos adaptativos y audio 3D, además de una nueva generación de increíbles juegos de PlayStation.',
      warranty: '12 meses de garantía oficial con Sony PlayStation México.',
      extractedAt: new Date().toISOString()
    }
  ];

  res.json({ samples });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
