import React, { useState, useCallback } from 'react';
import { Clip } from '../types';

type Provider = 'pixabay' | 'pexels' | 'unsplash';

interface StockResult {
  id: string;
  thumbnail: string;
  preview: string;
  downloadUrl: string;
  type: 'video' | 'image';
  duration?: number;
  title: string;
  provider: Provider;
}

interface StockVideoSearchProps {
  onAddClip: (clip: Clip) => void;
  selectedLayer: number;
  currentFrame: number;
}

const PROVIDERS: { id: Provider; label: string; type: string }[] = [
  { id: 'pixabay', label: 'Pixabay', type: '動画 + 画像' },
  { id: 'pexels', label: 'Pexels', type: '動画 + 画像' },
  { id: 'unsplash', label: 'Unsplash', type: '画像のみ' },
];

function getStoredKey(provider: Provider): string {
  return localStorage.getItem(`stock_api_key_${provider}`) || '';
}
function setStoredKey(provider: Provider, key: string) {
  localStorage.setItem(`stock_api_key_${provider}`, key);
}

async function searchPixabay(query: string, apiKey: string): Promise<StockResult[]> {
  const results: StockResult[] = [];

  // Videos
  const vUrl = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=6`;
  const vRes = await fetch(`/api/proxy-search?url=${encodeURIComponent(vUrl)}`);
  const vData = await vRes.json();
  if (vData.hits) {
    for (const hit of vData.hits) {
      const vid = hit.videos?.small || hit.videos?.medium || hit.videos?.tiny;
      results.push({
        id: `pxv_${hit.id}`,
        thumbnail: `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`,
        preview: vid?.url || '',
        downloadUrl: vid?.url || '',
        type: 'video',
        duration: hit.duration,
        title: hit.tags || 'Pixabay Video',
        provider: 'pixabay',
      });
    }
  }

  // Images
  const iUrl = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=6&image_type=photo`;
  const iRes = await fetch(`/api/proxy-search?url=${encodeURIComponent(iUrl)}`);
  const iData = await iRes.json();
  if (iData.hits) {
    for (const hit of iData.hits) {
      results.push({
        id: `pxi_${hit.id}`,
        thumbnail: hit.previewURL || hit.webformatURL,
        preview: hit.webformatURL,
        downloadUrl: hit.largeImageURL || hit.webformatURL,
        type: 'image',
        title: hit.tags || 'Pixabay Image',
        provider: 'pixabay',
      });
    }
  }

  return results;
}

async function searchPexels(query: string, apiKey: string): Promise<StockResult[]> {
  const results: StockResult[] = [];

  // Videos
  const vUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6`;
  const vRes = await fetch(`/api/proxy-search?url=${encodeURIComponent(vUrl)}`, {
    headers: { 'x-api-auth': apiKey },
  });
  const vData = await vRes.json();
  if (vData.videos) {
    for (const vid of vData.videos) {
      const file = vid.video_files?.find((f: any) => f.quality === 'sd') || vid.video_files?.[0];
      results.push({
        id: `pxlv_${vid.id}`,
        thumbnail: vid.image || '',
        preview: file?.link || '',
        downloadUrl: file?.link || '',
        type: 'video',
        duration: vid.duration,
        title: vid.url?.split('/').pop() || 'Pexels Video',
        provider: 'pexels',
      });
    }
  }

  // Images
  const iUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6`;
  const iRes = await fetch(`/api/proxy-search?url=${encodeURIComponent(iUrl)}`, {
    headers: { 'x-api-auth': apiKey },
  });
  const iData = await iRes.json();
  if (iData.photos) {
    for (const photo of iData.photos) {
      results.push({
        id: `pxli_${photo.id}`,
        thumbnail: photo.src?.tiny || photo.src?.small,
        preview: photo.src?.medium,
        downloadUrl: photo.src?.large || photo.src?.original,
        type: 'image',
        title: photo.alt || 'Pexels Image',
        provider: 'pexels',
      });
    }
  }

  return results;
}

async function searchUnsplash(query: string, apiKey: string): Promise<StockResult[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&client_id=${apiKey}`;
  const res = await fetch(`/api/proxy-search?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (!data.results) return [];
  return data.results.map((photo: any) => ({
    id: `us_${photo.id}`,
    thumbnail: photo.urls?.thumb || photo.urls?.small,
    preview: photo.urls?.small,
    downloadUrl: photo.urls?.regular || photo.urls?.full,
    type: 'image' as const,
    title: photo.alt_description || photo.description || 'Unsplash Image',
    provider: 'unsplash' as const,
  }));
}

export const StockVideoSearch: React.FC<StockVideoSearchProps> = ({ onAddClip, selectedLayer, currentFrame }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('pixabay');
  const [apiKey, setApiKey] = useState(getStoredKey('pixabay'));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setApiKey(getStoredKey(p));
    setResults([]);
    setError('');
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (!apiKey.trim()) { setError('API キーを入力してください'); return; }
    setStoredKey(provider, apiKey);
    setLoading(true);
    setError('');
    try {
      let res: StockResult[] = [];
      if (provider === 'pixabay') res = await searchPixabay(query, apiKey);
      else if (provider === 'pexels') res = await searchPexels(query, apiKey);
      else if (provider === 'unsplash') res = await searchUnsplash(query, apiKey);
      setResults(res);
      if (res.length === 0) setError('結果が見つかりませんでした');
    } catch (err: any) {
      setError(err.message || 'Search failed');
    }
    setLoading(false);
  }, [query, apiKey, provider]);

  const handleDownloadAndAdd = useCallback(async (item: StockResult) => {
    setDownloading(item.id);
    try {
      const ext = item.type === 'video' ? '.mp4' : '.jpg';
      const filename = `${item.provider}_${item.id.replace(/[^a-zA-Z0-9_]/g, '')}${ext}`;

      const res = await fetch('/api/download-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.downloadUrl, filename }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      if (item.type === 'video') {
        // Add as bg clip with video
        onAddClip({
          id: `bg_stock_${Date.now()}`,
          type: 'bg',
          layer: selectedLayer,
          startTime: currentFrame,
          duration: (item.duration ?? 5) * 30, // convert seconds to frames
          bg_video: data.path,
          bg_image: '',
        });
      } else {
        // Add as bg clip with image
        onAddClip({
          id: `bg_stock_${Date.now()}`,
          type: 'bg',
          layer: selectedLayer,
          startTime: currentFrame,
          duration: 90,
          bg_image: data.path,
        });
      }
    } catch (err: any) {
      setError(`ダウンロード失敗: ${err.message}`);
    }
    setDownloading(null);
  }, [onAddClip, selectedLayer, currentFrame]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 bg-gradient-to-r from-indigo-800 to-purple-800 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] rounded font-bold flex items-center gap-1.5 justify-center"
      >
        🔍 素材検索 (Stock)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase">素材検索</span>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white text-[10px]">✕</button>
      </div>

      {/* Provider selector */}
      <div className="flex gap-1">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => handleProviderChange(p.id)}
            className={`flex-1 px-1 py-1 text-[9px] rounded font-bold transition-colors ${
              provider === p.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title={p.type}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* API Key */}
      <input
        type="password"
        placeholder={`${PROVIDERS.find(p=>p.id===provider)?.label} API キー`}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-slate-200 rounded p-1.5 text-[10px] outline-none focus:border-indigo-500"
      />

      {/* Search */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="検索キーワード (英語推奨)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 rounded p-1.5 text-[10px] outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-[10px] rounded font-bold"
        >
          {loading ? '...' : '検索'}
        </button>
      </div>

      {error && <div className="text-[9px] text-red-400 bg-red-400/10 p-1.5 rounded">{error}</div>}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
          {results.map(item => (
            <div
              key={item.id}
              className="relative group rounded overflow-hidden border border-slate-700 cursor-pointer hover:border-indigo-500 transition-colors"
              onClick={() => handleDownloadAndAdd(item)}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-16 object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {downloading === item.id ? (
                  <span className="text-[9px] text-white animate-pulse">ダウンロード中...</span>
                ) : (
                  <span className="text-[9px] text-white font-bold">+ 追加</span>
                )}
              </div>
              <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                {item.type === 'video' && (
                  <span className="bg-sky-600 text-white text-[7px] px-1 rounded-sm font-bold">動画</span>
                )}
                {item.type === 'image' && (
                  <span className="bg-emerald-600 text-white text-[7px] px-1 rounded-sm font-bold">画像</span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                <span className="text-[7px] text-slate-300 truncate block">{item.title.slice(0, 20)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
