const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (path) => ipcRenderer.invoke('openFile', path),
  getNext: () => ipcRenderer.invoke('getNext'),
  getFurigana: (sentence) => ipcRenderer.invoke('getFurigana', sentence),
  getKana: (word) => ipcRenderer.invoke('getKana', word),
  getMeanings: (kanji_kana) => ipcRenderer.invoke('getMeanings', kanji_kana),
  makeNote: (sentence, word, meaning, image) => ipcRenderer.invoke('makeNote', sentence, word, meaning, image),
  openNote: (note_id) => ipcRenderer.invoke('openNote', note_id),
})