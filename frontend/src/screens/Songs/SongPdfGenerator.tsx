import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { Button, Portal, Dialog, TextInput as PaperTextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? '';

const preprocessHtml = (html: string) => {
  if (!html) return '';
  if (html.includes('tempPool.children.length === 0')) {
    return html;
  }
  const searchStr = 'function paginate() {';
  const replaceStr = `function paginate() {
            const tempContainer = document.getElementById('pages-container');
            const tempPool = document.getElementById('raw-content-pool');
            if (tempPool && tempContainer && tempPool.children.length === 0) {
              const items = [];
              const headers = Array.from(tempContainer.querySelectorAll('.song-header-block'));
              headers.forEach(header => {
                items.push(header);
                const songId = header.getAttribute('data-song-id');
                const verses = Array.from(tempContainer.querySelectorAll('.song-verse[data-song-id="' + songId + '"]'));
                verses.forEach(v => items.push(v));
              });
              items.forEach(item => {
                tempPool.appendChild(item);
              });
            }`;
  return html.replace(searchStr, replaceStr);
};

const SongPdfGenerator = ({ route, navigation }: any) => {
  const { pdfId, selectedSongs, sheetTitle, footerText, columnCount, orientation: initialOrientation } = route.params || {};
  const { colors, theme } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<any[]>(selectedSongs || []);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation || 'landscape');

  const webViewRef = React.useRef<any>(null);

  // HTML output state
  const [initialHtml, setInitialHtml] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [printDialogVisible, setPrintDialogVisible] = useState(false);
  const [pdfTitle, setPdfTitle] = useState('');

  const loadSavedPdf = async () => {
    if (!pdfId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/generated-pdfs/${pdfId}`);
      if (res.data.status === 'Ok') {
        const saved = res.data.data;
        setPdfTitle(saved.title);
        const processed = preprocessHtml(saved.html);
        setInitialHtml(processed);
        setEditedHtml(processed);
        setSongs(saved.songs || []);
        if (saved.html?.includes('size: A4 portrait')) {
          setOrientation('portrait');
        } else {
          setOrientation('landscape');
        }
      }
    } catch (error) {
      console.error('Error loading saved PDF:', error);
      Alert.alert('Error', 'Failed to load saved PDF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pdfId) {
      loadSavedPdf();
    } else if (selectedSongs && selectedSongs.length > 0) {
      const html = generateInitialHtmlForParams(
        selectedSongs,
        sheetTitle || 'துதிப்பாடல்கள்',
        footerText || 'Contact : 9876543210',
        columnCount || 3,
        initialOrientation || 'landscape'
      );
      setInitialHtml(html);
      setEditedHtml(html);
    }
  }, [pdfId]);

  const generateInitialHtmlForParams = (
    selectedSongsList: any[],
    sheetTitleParam: string,
    footerTextParam: string,
    columnCountParam: number,
    orientationParam: 'landscape' | 'portrait'
  ) => {
    let songBlocksHtml = '';
    selectedSongsList.forEach((song, idx) => {
      const tamilVerses = song.lyricsTamil ? song.lyricsTamil.split(/\r?\n\s*\r?\n/) : [];
      const englishVerses = song.lyricsEnglish ? song.lyricsEnglish.split(/\r?\n\s*\r?\n/) : [];

      const maxVerses = Math.max(tamilVerses.length, englishVerses.length);
      let versesHtml = '';

      for (let i = 0; i < maxVerses; i++) {
        const tamilVerse = tamilVerses[i] ? tamilVerses[i].trim() : '';
        const englishVerse = englishVerses[i] ? englishVerses[i].trim() : '';

        let verseContent = '';
        if (tamilVerse) {
          verseContent += `<div class="song-lyrics" contenteditable="true">${tamilVerse.replace(/\r?\n/g, '<br>')}</div>`;
        }
        if (englishVerse) {
          verseContent += `<div class="song-lyrics-en" contenteditable="true">${englishVerse.replace(/\r?\n/g, '<br>')}</div>`;
        }

        if (verseContent) {
          versesHtml += `
            <div class="song-verse" data-song-id="${song._id}">
              ${verseContent}
            </div>
          `;
        }
      }

      songBlocksHtml += `
        <div class="song-header-block" id="song-header-${song._id}" data-song-id="${song._id}">
          <div class="song-ctrls">
            <span class="song-drag-handle">☰ Card - ${idx + 1}</span>
            <div style="display:flex; gap: 4px;">
              <button onclick="moveUp('${song._id}')" class="ctrl-btn">🔼</button>
              <button onclick="moveDown('${song._id}')" class="ctrl-btn">🔽</button>
              <button onclick="removeSong('${song._id}')" class="ctrl-btn remove">❌</button>
            </div>
          </div>
          <div class="song-header" contenteditable="true">பாடல் - ${idx + 1}</div>
          <div class="song-title" contenteditable="true">${song.titleTamil || song.titleEnglish}</div>
        </div>
        ${versesHtml}
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style id="page-style">
          @page {
            size: A4 ${orientationParam};
            margin: 0;
          }
        </style>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&display=swap');
          :root {
            --zoom-scale: 1;
            --column-count: ${columnCountParam};
            --border-style: solid;
            --border-color: #000000;
            --border-width: 1px;
            --column-padding: 15px;
            --column-gap: 15px;
            --text-column-gap: 45px;
            --bg-color: #ffffff;
            --text-color: #000000;
          }
          body {
            font-family: 'Noto Sans Tamil', sans-serif;
            margin: 0;
            padding: 0;
            background-color: ${colors.background};
            color: ${colors.text};
            box-sizing: border-box;
          }
          
          /* Editor Toolbar Layout */
          .editor-toolbar {
            background: ${colors.primary};
            color: white;
            padding: 8px 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            align-items: center;
            box-sizing: border-box;
            width: 100%;
          }
          .toolbar-section {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .section-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            opacity: 0.7;
            margin-right: 4px;
            color: #fff;
          }
          .toolbar-btn {
            background: rgba(255,255,255,0.15);
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
          }
          .toolbar-btn:active {
            background: rgba(255,255,255,0.35);
          }
          .toolbar-select {
            background: rgba(255,255,255,0.15);
            border: none;
            color: white;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            outline: none;
          }
          .toolbar-select option {
            color: #333;
          }
          .toolbar-divider {
            width: 1px;
            height: 20px;
            background: rgba(255,255,255,0.25);
          }
          
          /* Pages Container Layout */
          #pages-container {
            margin-top: 15px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
            box-sizing: border-box;
            width: 100%;
          }
          
          /* Scaled A4 Page View Card */
          .page {
            width: 840px;
            height: 1180px;
            zoom: var(--zoom-scale);
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #ccc;
            box-sizing: border-box;
            padding: 35px;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          .page.landscape {
            width: 1180px;
            height: 840px;
          }
          .page::before {
            content: "Page " attr(id);
            position: absolute;
            top: -20px;
            left: 0;
            font-size: 10px;
            font-weight: bold;
            color: #777;
            text-transform: uppercase;
          }
          
          /* Column Borders Overlay matching song sheet.pdf styling */
          .column-borders-container {
            position: absolute;
            top: 35px;
            bottom: 35px;
            left: 35px;
            right: 35px;
            display: flex;
            flex-direction: row;
            gap: var(--column-gap);
            pointer-events: none;
            z-index: 1;
          }
          .column-border-box {
            flex: 1;
            border-style: var(--border-style);
            border-width: var(--border-width);
            border-color: var(--border-color);
            background-color: var(--bg-color);
            box-sizing: border-box;
            height: 100%;
          }
          
          /* Continuous Text Column Grid Flow */
          .page-content {
            position: relative;
            z-index: 2;
            flex: 1;
            column-count: var(--column-count);
            column-gap: var(--text-column-gap);
            column-fill: auto;
            width: 100%;
            height: 100%;
            padding: 10px 15px;
            box-sizing: border-box;
            overflow: hidden;
            min-height: 0;
          }
          
          /* Title & Footer typography */
          .sheet-header {
            font-size: 26px;
            font-weight: 800;
            text-align: center;
            margin-bottom: 20px;
            text-decoration: underline;
            font-family: 'Noto Sans Tamil', sans-serif;
            color: var(--text-color);
            outline: none;
            width: 100%;
          }
          .footer {
            text-align: right;
            font-size: 11px;
            font-weight: bold;
            margin-top: auto;
            padding-top: 10px;
            border-top: 1px dashed #ccc;
            font-family: 'Noto Sans Tamil', sans-serif;
            color: var(--text-color);
            opacity: 0.8;
            outline: none;
            width: 100%;
          }
          
          .song-header-block {
            margin-top: 20px;
            margin-bottom: 8px;
            text-align: center;
            position: relative;
            outline: none;
            color: var(--text-color);
            width: 100%;
            break-inside: avoid;
          }
          .song-verse {
            margin-bottom: 12px;
            text-align: center;
            position: relative;
            outline: none;
            color: var(--text-color);
            width: 100%;
            break-inside: avoid;
          }
          .song-header-block.active-focus, .song-verse.active-focus {
            outline: 1.5px dashed ${colors.tint};
            outline-offset: 4px;
          }
          
          /* Song drag controls (hidden in print) */
          .song-ctrls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: ${colors.theme === 'dark' ? colors.surface : '#eee'};
            padding: 3px 6px;
            border-radius: 4px;
            margin-bottom: 8px;
            border: 1px solid ${colors.border};
          }
          .song-drag-handle {
            font-size: 10px;
            font-weight: bold;
            color: ${colors.textSecondary};
            user-select: none;
          }
          .ctrl-btn {
            border: none;
            background: none;
            font-size: 11px;
            padding: 1px 4px;
            cursor: pointer;
          }
          .ctrl-btn.remove {
            color: red;
            font-weight: bold;
          }
          
          /* Print-specific layout overrides to match replica rules */
          @media print {
            body {
              background-color: white !important;
            }
            .editor-toolbar, .song-ctrls {
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              line-height: 0 !important;
            }
            #pages-container {
              margin-top: 0 !important;
              padding: 0 !important;
              background: none !important;
              display: block !important;
            }
            .page {
              width: 210mm !important;
              height: 297mm !important;
              zoom: 1 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              page-break-inside: avoid !important;
              padding: 15mm !important;
              box-sizing: border-box !important;
            }
            .page.landscape {
              width: 297mm !important;
              height: 210mm !important;
            }
            .column-borders-container {
              top: 15mm !important;
              bottom: 15mm !important;
              left: 15mm !important;
              right: 15mm !important;
            }
            .page::before, .editor-toolbar, .song-ctrls {
              display: none !important;
            }
            .active-focus {
              outline: none !important;
            }
          }
        </style>
      </head>
      <body class="${orientationParam}-layout">
        
        <!-- Sticky Editor Toolbar -->
        <div class="editor-toolbar">
          <div class="toolbar-section">
            <span class="section-title">Page</span>
            <button class="toolbar-btn" onclick="setOrientation('portrait')">📄 Portrait</button>
            <button class="toolbar-btn" onclick="setOrientation('landscape')">📖 Landscape</button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="toolbar-section">
            <span class="section-title">Columns</span>
            <select class="toolbar-select" onchange="setColumnCount(this.value)">
              <option value="1" ${columnCountParam === 1 ? 'selected' : ''}>1 Column</option>
              <option value="2" ${columnCountParam === 2 ? 'selected' : ''}>2 Columns</option>
              <option value="3" ${columnCountParam === 3 ? 'selected' : ''}>3 Columns</option>
            </select>
          </div>
          <div class="toolbar-divider"></div>
          <div class="toolbar-section">
            <span class="section-title">Borders</span>
            <select class="toolbar-select" onchange="setBorderPreset(this.value)">
              <option value="solid-black-1">Solid Black (1px)</option>
              <option value="solid-black-2">Solid Black (2px)</option>
              <option value="dashed-black-1">Dashed Black</option>
              <option value="double-black-3">Double Black</option>
              <option value="none">No Borders</option>
            </select>
          </div>
        </div>
        
        <!-- Master A4 layout container -->
        <div id="pages-container">
          <!-- Populated dynamically via pagination algorithm -->
        </div>
        
        <!-- Raw pool container (hidden) containing template content -->
        <div id="raw-content-pool" style="display: none;">
          ${songBlocksHtml}
        </div>
        
        <script>
          let activeBlock = null;
          let columnCount = ${columnCountParam};
          let masterTitleText = "${sheetTitleParam}";
          let masterFooterText = "${footerTextParam}";
          
          // Send updated HTML string back to React Native on any keystroke or block change
          function notifyChange() {
            // Temporarily clear any active focus styling before sending HTML to prevent saving focus states
            const activeEls = Array.from(document.querySelectorAll('.active-focus'));
            activeEls.forEach(el => el.classList.remove('active-focus'));
            
            const rawHtml = document.documentElement.outerHTML;
            
            // Restore selection outlines
            activeEls.forEach(el => el.classList.add('active-focus'));
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'EDIT_HTML',
              html: rawHtml
            }));
          }
          
          // Set selection outlines on click
          document.addEventListener('click', function(e) {
            const verse = e.target.closest('.song-verse');
            const header = e.target.closest('.song-header-block');
            const sheetHeader = e.target.closest('.sheet-header');
            const footer = e.target.closest('.footer');
            
            document.querySelectorAll('.active-focus').forEach(el => {
              el.classList.remove('active-focus');
            });
            activeBlock = null;
            
            if (verse) {
              const songId = verse.getAttribute('data-song-id');
              activeBlock = songId;
              document.querySelectorAll('[data-song-id="' + songId + '"]').forEach(el => {
                el.classList.add('active-focus');
              });
            } else if (header) {
              const songId = header.getAttribute('data-song-id');
              activeBlock = songId;
              document.querySelectorAll('[data-song-id="' + songId + '"]').forEach(el => {
                el.classList.add('active-focus');
              });
            } else if (sheetHeader) {
              sheetHeader.classList.add('active-focus');
            } else if (footer) {
              footer.classList.add('active-focus');
            }
          });
          
          // Keystroke change observers
          document.addEventListener('input', function(e) {
            if (e.target.id === 'master-title') {
              masterTitleText = e.target.innerText;
            } else if (e.target.id === 'master-footer') {
              masterFooterText = e.target.innerText;
            }
            notifyChange();
          });
          
          // Document manipulation scripts
          function moveUp(songId) {
            const pool = document.getElementById('raw-content-pool');
            const header = pool.querySelector('#song-header-' + songId);
            if (!header) return;
            
            // Gather all elements belonging to this song (header + trailing verses)
            const elements = [header];
            let next = header.nextElementSibling;
            while (next && next.classList.contains('song-verse')) {
              elements.push(next);
              next = next.nextElementSibling;
            }
            
            // Find preceding song header to insert before it
            let prev = header.previousElementSibling;
            while (prev && !prev.classList.contains('song-header-block')) {
              prev = prev.previousElementSibling;
            }
            
            if (prev) {
              elements.reverse().forEach(el => {
                pool.insertBefore(el, prev);
              });
              paginate();
            }
          }
          
          function moveDown(songId) {
            const pool = document.getElementById('raw-content-pool');
            const header = pool.querySelector('#song-header-' + songId);
            if (!header) return;
            
            const elements = [header];
            let next = header.nextElementSibling;
            while (next && next.classList.contains('song-verse')) {
              elements.push(next);
              next = next.nextElementSibling;
            }
            
            // Find the song block after this one
            let nextHeader = elements[elements.length - 1].nextElementSibling;
            while (nextHeader && !nextHeader.classList.contains('song-header-block')) {
              nextHeader = nextHeader.nextElementSibling;
            }
            
            if (nextHeader) {
              // Find the element after that song block to insert before
              let insertBeforeTarget = nextHeader.nextElementSibling;
              while (insertBeforeTarget && insertBeforeTarget.classList.contains('song-verse')) {
                insertBeforeTarget = insertBeforeTarget.nextElementSibling;
              }
              
              elements.forEach(el => {
                if (insertBeforeTarget) {
                  pool.insertBefore(el, insertBeforeTarget);
                } else {
                  pool.appendChild(el);
                }
              });
              paginate();
            }
          }
          
          function removeSong(songId) {
            if (!confirm('Are you sure you want to remove this song from layout?')) return;
            const pool = document.getElementById('raw-content-pool');
            const header = pool.querySelector('#song-header-' + songId);
            if (!header) return;
            
            let next = header.nextElementSibling;
            while (next && next.classList.contains('song-verse')) {
              const toRemove = next;
              next = next.nextElementSibling;
              pool.removeChild(toRemove);
            }
            pool.removeChild(header);
            
            paginate();
          }
          
          function setOrientation(layout) {
            document.body.className = layout + '-layout';
            const styleEl = document.getElementById('page-style');
            if (styleEl) {
              styleEl.innerHTML = '@page { size: A4 ' + layout + '; margin: 0; }';
            }
            adjustZoom();
            paginate();
          }
          
          function setColumnCount(count) {
            columnCount = parseInt(count);
            document.documentElement.style.setProperty('--column-count', columnCount);
            paginate();
          }
          
          function setBorderPreset(preset) {
            let style = 'solid';
            let color = '#000000';
            let width = '1px';
            let count = columnCount;
            
            if (preset === 'solid-black-2') {
              width = '2px';
            } else if (preset === 'dashed-black-1') {
              style = 'dashed';
            } else if (preset === 'double-black-3') {
              style = 'double';
              width = '3px';
            } else if (preset === 'none') {
              width = '0px';
            }
            
            document.documentElement.style.setProperty('--border-style', style);
            document.documentElement.style.setProperty('--border-color', color);
            document.documentElement.style.setProperty('--border-width', width);
            notifyChange();
          }
          
          // Main dynamic pagination compiler
          function paginate() {
            const container = document.getElementById('pages-container');
            const pool = document.getElementById('raw-content-pool');
            const isLandscape = document.body.classList.contains('landscape-layout');
            
            // Read current zoom scale to perform unscaled pagination measurements
            const activeZoom = document.documentElement.style.getPropertyValue('--zoom-scale') || '1';
            document.documentElement.style.setProperty('--zoom-scale', '1');
            
            container.innerHTML = '';
            
            let pageNum = 1;
            let currentPageEl = createNewPage(isLandscape, pageNum);
            container.appendChild(currentPageEl);
            let pageContentEl = currentPageEl.querySelector('.page-content');
            
            // Append main sheet header to the first page content
            let titleEl = document.getElementById('master-title');
            if (!titleEl) {
              titleEl = document.createElement('h1');
              titleEl.className = 'sheet-header';
              titleEl.contentEditable = 'true';
              titleEl.id = 'master-title';
            }
            titleEl.innerText = masterTitleText;
            pageContentEl.appendChild(titleEl);
            
            // Distribute song parts sequentially across A4 columns
            const parts = Array.from(pool.children);
            let songCounter = 0;
            
            parts.forEach((part) => {
              if (part.classList.contains('song-header-block')) {
                songCounter++;
                const headerText = part.querySelector('.song-header');
                if (headerText) {
                  headerText.innerText = 'பாடல் - ' + songCounter;
                }
                const songLabel = part.querySelector('.song-drag-handle');
                if (songLabel) songLabel.innerText = 'Card - ' + songCounter;
              }
              
              pageContentEl.appendChild(part);
              
              // Move layout blocks to a new page if they overflow the physical page columns boundary
              if (pageContentEl.scrollWidth > pageContentEl.clientWidth) {
                const minChildren = (pageNum === 1) ? 2 : 1;
                if (pageContentEl.children.length > minChildren) {
                  pageContentEl.removeChild(part);
                  
                  pageNum++;
                  currentPageEl = createNewPage(isLandscape, pageNum);
                  container.appendChild(currentPageEl);
                  pageContentEl = currentPageEl.querySelector('.page-content');
                  
                  pageContentEl.appendChild(part);
                }
              }
            });
            
            // Append footer block to final page
            let footerEl = document.getElementById('master-footer');
            if (!footerEl) {
              footerEl = document.createElement('div');
              footerEl.className = 'footer';
              footerEl.contentEditable = 'true';
              footerEl.id = 'master-footer';
            }
            footerEl.innerText = masterFooterText;
            pageContentEl.appendChild(footerEl);
            
            if (activeBlock) {
              document.querySelectorAll('[data-song-id="' + activeBlock + '"]').forEach(el => {
                el.classList.add('active-focus');
              });
            }
            
            document.documentElement.style.setProperty('--zoom-scale', activeZoom);
            notifyChange();
          }
          
          function createNewPage(isLandscape, pageNum) {
            const page = document.createElement('div');
            page.className = 'page' + (isLandscape ? ' landscape' : '');
            page.id = 'page-' + pageNum;
            page.setAttribute('id', pageNum);
            
            const bordersContainer = document.createElement('div');
            bordersContainer.className = 'column-borders-container';
            for (let i = 0; i < columnCount; i++) {
              const borderBox = document.createElement('div');
              borderBox.className = 'column-border-box';
              bordersContainer.appendChild(borderBox);
            }
            page.appendChild(bordersContainer);
            
            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';
            page.appendChild(pageContent);
            
            return page;
          }
          
          function adjustZoom() {
            let width = window.innerWidth;
            if (!width || width <= 0) width = 375;
            const isLandscape = document.body.classList.contains('landscape-layout');
            const pageW = isLandscape ? 1220 : 880;
            const scale = Math.max(0.1, (width - 16) / pageW);
            document.documentElement.style.setProperty('--zoom-scale', scale);
          }
          
          window.addEventListener('resize', adjustZoom);
          function init() {
            adjustZoom();
            paginate();
          }
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(init, 200);
          } else {
            window.addEventListener('load', () => setTimeout(init, 200));
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'EDIT_HTML') {
        setEditedHtml(data.html);
      } else if (data.type === 'WEBVIEW_ERROR') {
        Alert.alert('WebView Script Error', `${data.message}\nLine: ${data.lineno}\nSource: ${data.source}`);
      } else if (data.type === 'WEBVIEW_CONSOLE_ERROR') {
        console.warn('WebView Console Error:', data.args.join(' '));
      }
    } catch (e) {
      // silent fail
    }
  };

  const performPrint = async (customTitle?: string) => {
    if (!editedHtml) return;
    const finalTitle = (customTitle || pdfTitle || '').trim();
    try {
      // Strip active-focus class from markup so outline never prints
      const printHtml = editedHtml.replace(/\s*active-focus\s*/g, ' ');
      const isLandscape = orientation === 'landscape';
      const { uri } = await Print.printToFileAsync({
        html: printHtml,
        width: isLandscape ? 842 : 595,
        height: isLandscape ? 595 : 842,
      });
      const sanitizedTitle = finalTitle.replace(/[^a-zA-Z0-9\u0B80-\u0BFF\s_-]/g, '').trim() || 'Song Sheet';
      const newUri = FileSystem.cacheDirectory + `${sanitizedTitle}.pdf`;
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: finalTitle });
      setPdfTitle(finalTitle);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to print PDF file');
    }
  };

  const handlePrint = async () => {
    if (!pdfTitle.trim()) {
      setPrintDialogVisible(true);
    } else {
      await performPrint();
    }
  };

  const handleSave = async (titleToSave: string) => {
    const finalTitle = titleToSave.trim();
    if (!finalTitle) {
      Alert.alert('Title Required', 'Please enter a name for this song sheet');
      return;
    }

    try {
      setIsSaving(true);
      setPdfTitle(finalTitle);
      const cleanHtml = editedHtml.replace(/\s*active-focus\s*/g, ' ');
      const payload = {
        title: finalTitle,
        html: cleanHtml,
        songs: songs.map(s => s._id)
      };

      if (pdfId) {
        await axios.put(`${BASE_URL}/api/generated-pdfs/${pdfId}`, payload);
        Alert.alert(
          'Layout Updated!',
          'Your changes have been saved. You can view or print this layout anytime in the "Generated PDFs" tab from the drawer menu.'
        );
      } else {
        await axios.post(`${BASE_URL}/api/generated-pdfs`, payload);
        Alert.alert(
          'Layout Saved!',
          'Your new song sheet layout is saved! You can access, edit, or print it anytime from the "Generated PDFs" tab in the drawer menu.'
        );
      }
      setSaveDialogVisible(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving song sheet:', error);
      Alert.alert('Error', 'Failed to save song sheet layout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSelection = () => {
    // Navigate back to SongSelectionScreen passing current songs to initialize selection state
    navigation.navigate('SongSelectionScreen', { initialSelectedSongs: songs });
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview & Edit Sheet</Text>
      </View>

      <View style={styles.bodyContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={styles.loaderText}>Loading saved layout...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Instructions */}
            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.theme === 'dark' ? colors.text : "#146C94"} />
              <Text style={styles.instructionText}>
                Tap text inside the preview below to edit the design before printing.
              </Text>
            </View>

            {/* Preview WebView Canvas */}
            <View style={styles.webViewContainer}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: initialHtml }}
                onMessage={handleWebViewMessage}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={true}
              />

              <View style={styles.actionRow}>
                <Button
                  mode="outlined"
                  style={[styles.actionBtn, { borderColor: colors.tint }]}
                  labelStyle={{ fontSize: 11, marginHorizontal: 2 }}
                  onPress={handleEditSelection}
                  textColor={colors.tint}
                >
                  Edit Selection
                </Button>
                <Button
                  mode="contained"
                  style={[styles.actionBtn, { backgroundColor: '#19A7CE' }]}
                  labelStyle={{ fontSize: 11, marginHorizontal: 2 }}
                  textColor="#fff"
                  onPress={() => {
                    setPdfTitle(pdfTitle || 'My Song Sheet');
                    setSaveDialogVisible(true);
                  }}
                >
                  Save Layout
                </Button>
                <Button
                  mode="contained"
                  style={[styles.actionBtn, { backgroundColor: '#146C94' }]}
                  labelStyle={{ fontSize: 11, marginHorizontal: 2 }}
                  textColor="#fff"
                  onPress={handlePrint}
                >
                  Print PDF
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>

      {saveDialogVisible && (
        <SaveLayoutDialog
          visible={saveDialogVisible}
          onDismiss={() => setSaveDialogVisible(false)}
          onSave={handleSave}
          isSaving={isSaving}
          initialTitle={pdfTitle}
        />
      )}

      {printDialogVisible && (
        <PrintDocDialog
          visible={printDialogVisible}
          onDismiss={() => setPrintDialogVisible(false)}
          onPrint={(title) => {
            setPrintDialogVisible(false);
            performPrint(title);
          }}
          initialTitle={pdfTitle}
        />
      )}
    </SafeAreaView>
  );
};

interface SaveDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (title: string) => void;
  isSaving: boolean;
  initialTitle: string;
}

const SaveLayoutDialog = React.memo(({ visible, onDismiss, onSave, isSaving, initialTitle }: SaveDialogProps) => {
  const titleRef = React.useRef(initialTitle);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Save Sheet Layout</Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Give a title to save this layout configuration:</Text>
          <PaperTextInput
            mode="outlined"
            defaultValue={initialTitle}
            onChangeText={(text) => { titleRef.current = text; }}
            placeholder="e.g. Sunday Service worship list"
            placeholderTextColor="#888"
            outlineColor="#ccc"
            activeOutlineColor="#146C94"
            textColor="#333"
            style={{ backgroundColor: '#fff' }}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={() => onSave(titleRef.current)} loading={isSaving} disabled={isSaving}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
});

interface PrintDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onPrint: (title: string) => void;
  initialTitle: string;
}

const PrintDocDialog = React.memo(({ visible, onDismiss, onPrint, initialTitle }: PrintDialogProps) => {
  const titleRef = React.useRef(initialTitle);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Name your PDF document</Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Please enter a name for the PDF file:</Text>
          <PaperTextInput
            mode="outlined"
            defaultValue={initialTitle}
            onChangeText={(text) => { titleRef.current = text; }}
            placeholder="e.g. Sunday Service worship list"
            placeholderTextColor="#888"
            outlineColor="#ccc"
            activeOutlineColor="#146C94"
            textColor="#333"
            style={{ backgroundColor: '#fff' }}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={() => {
            if (!titleRef.current.trim()) {
              Alert.alert('Name Required', 'Please enter a name for the PDF file');
              return;
            }
            onPrint(titleRef.current);
          }}>Generate PDF</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.primary,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#E6F0FA',
    padding: 10,
    gap: 8,
  },
  instructionText: {
    fontSize: 11.5,
    color: colors.theme === 'dark' ? colors.text : '#146C94',
    fontWeight: '500',
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.tint,
    fontWeight: '500',
  }
});

export default SongPdfGenerator;
