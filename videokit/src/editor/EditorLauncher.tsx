import React from 'react';
import {
  EditorStarterId,
  editorStarterCatalog,
} from './starter-presets';

const launchStarter = (starterId: EditorStarterId) => {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.set('starter', starterId);
  params.delete('variant');
  window.location.search = params.toString();
};

export const EditorLauncher: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_42%),linear-gradient(135deg,rgba(14,23,38,0.96),rgba(2,6,23,1))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-black uppercase tracking-[0.32em] text-slate-300">
            Movie Maker Launcher
          </div>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            最初に動画タイプを選んで、
            <br />
            そのまま編集を始められるようにしました。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            `解説動画 / ゲーム実況 / LINEチャット / その他` から選ぶと、
            それぞれに合ったサンプルや現在の script を読み込んで editor を開きます。
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {editorStarterCatalog.map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => launchStarter(starter.id)}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${starter.accentClassName}`} />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.06] blur-2xl transition-transform duration-300 group-hover:scale-125" />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">
                  {starter.shortLabel}
                </div>
                <h2 className="mt-3 text-2xl font-black text-white">
                  {starter.title}
                </h2>
                <p className="mt-4 min-h-[84px] text-sm leading-6 text-slate-300">
                  {starter.description}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] text-slate-200 uppercase">
                  Open Editor
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
