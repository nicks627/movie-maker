import React from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from './editor/Editor';
import { EditorLauncher } from './editor/EditorLauncher';
import { resolveStarterFromSearch } from './editor/starter-presets';
import './index.css';

const rootElement = document.getElementById('root');

const hasStarterSelection = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  return resolveStarterFromSearch(window.location.search) !== null;
};

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      {hasStarterSelection() ? <Editor /> : <EditorLauncher />}
    </React.StrictMode>
  );
}
