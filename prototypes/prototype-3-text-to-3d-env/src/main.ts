/**
 * Text-to-3D Environment Generator — Application Entry Point
 *
 * Phase 1-3: Three.js scaffold + Moderator workflow + Scene Renderer Core.
 *
 * Three input modes:
 * 1. User — describe scene in NL, submit to moderator
 * 2. Moderator — use preset prompts + paste LLM JSON response
 * 3. Structured — line-by-line structured input, parsed directly
 */

import * as THREE from 'three';
import './style.css';
import { initRenderer } from './scene/renderer.ts';
import { buildSceneFromSchema, buildDemoScene } from './scene/builder.ts';
import { presets, getDefaultPreset, type PromptPreset } from './llm/prompts.ts';
import { validateSceneJSON, formatValidationErrors } from './llm/validator.ts';
import { parseStructured } from './llm/structured.ts';
import type { SceneSchema } from './types/scene.ts';
import { saveToHistory, getHistory, deleteFromHistory, clearHistory } from './ui/history.ts';
import { structuredPresets } from './llm/structured-presets.ts';

// ─── DOM refs ──────────────────────────────────────────────────────────────

const container = document.getElementById('three-container')!;
const tabs = document.querySelectorAll<HTMLButtonElement>('.tab');
const panels = {
  user: document.getElementById('panel-user')!,
  structured: document.getElementById('panel-structured')!,
  moderator: document.getElementById('panel-moderator')!,
};

const userInput = document.getElementById('description-input') as HTMLTextAreaElement;
const userSubmitBtn = document.getElementById('user-submit-btn') as HTMLButtonElement;
const statusMsg = document.getElementById('status-message')!;

const structuredInput = document.getElementById('structured-input') as HTMLTextAreaElement;
const structuredSubmitBtn = document.getElementById('structured-submit-btn') as HTMLButtonElement;
const structuredPresetSelect = document.getElementById('structured-preset-select') as HTMLSelectElement;

const historyList = document.getElementById('history-list')!;
const historyEmpty = document.getElementById('history-empty')!;
const historyClearBtn = document.getElementById('history-clear-btn') as HTMLButtonElement;

const modUserDesc = document.getElementById('mod-user-description')!;
const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
const promptPreview = document.getElementById('prompt-preview')!;
const copyPromptBtn = document.getElementById('copy-prompt-btn') as HTMLButtonElement;
const jsonPasteArea = document.getElementById('json-paste-area') as HTMLTextAreaElement;
const validationResult = document.getElementById('validation-result')!;
const validateJsonBtn = document.getElementById('validate-json-btn') as HTMLButtonElement;
const renderSceneBtn = document.getElementById('render-scene-btn') as HTMLButtonElement;

// ─── State ─────────────────────────────────────────────────────────────────

let currentPreset: PromptPreset = getDefaultPreset();
let currentUserDescription = '';
let validatedSchema: Partial<SceneSchema> | null = null;
let currentHistoryId: string | null = null;

// ─── Three.js Bootstrap ────────────────────────────────────────────────────

const rendererState = initRenderer({
  container,
  cameraPosition: [12, 8, 12],
  cameraTarget: [0, 0, 0],
  backgroundColor: '#111122',
});

// Show initial demo
buildDemoScene(rendererState.scene);

// ─── Apply camera from scene userData ───────────────────────────────────────

function applySceneCamera(): void {
  const pos = rendererState.scene.userData.cameraPosition as [number, number, number] | undefined;
  const target = rendererState.scene.userData.cameraTarget as [number, number, number] | undefined;
  if (pos) rendererState.camera.position.set(...pos);
  if (target) rendererState.controls.target.set(...target);
  rendererState.controls.update();
}

// ─── Tab Switching ─────────────────────────────────────────────────────────

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode!;
    tabs.forEach((t) => { t.classList.remove('active'); });
    tab.classList.add('active');
    Object.entries(panels).forEach(([key, el]) => {
      el.classList.toggle('active', key === mode);
    });

    if (mode === 'moderator' && currentUserDescription) {
      updateModeratorPanel();
    }
  });
});

// ─── User Mode ─────────────────────────────────────────────────────────────

// Debounce utility
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Update submit button state with debounce to avoid excessive updates
const updateSubmitButtonState = debounce(() => {
    userSubmitBtn.disabled = userInput.value.trim().length === 0;
}, 150);

userInput.addEventListener('input', updateSubmitButtonState);

userSubmitBtn.addEventListener('click', () => {
    currentUserDescription = userInput.value.trim();
    if (!currentUserDescription) return;

    statusMsg.textContent = '✅ Sent to moderator! Switch to "Moderator" tab.';
    statusMsg.className = 'status-success';

    updateModeratorPanel();

    // Switch to moderator tab
    tabs.forEach((t) => { t.classList.remove('active'); });
    document.querySelector<HTMLButtonElement>('.tab[data-mode="moderator"]')?.classList.add('active');
    Object.values(panels).forEach((el) => { el.classList.remove('active'); });
    panels.moderator.classList.add('active');
});

// Clear button handler
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
clearBtn.addEventListener('click', () => {
    userInput.value = '';
    userSubmitBtn.disabled = true;
    statusMsg.textContent = 'Describe the scene you want to create.';
    statusMsg.className = 'status-idle';
    // Also clear moderator reference if needed
    modUserDesc.innerHTML = '<em>No description yet.</em>';
    promptPreview.textContent = currentPreset.buildPrompt('a simple 3D scene with some objects');
});

// ─── Moderator Mode ────────────────────────────────────────────────────────

function updateModeratorPanel(): void {
  modUserDesc.innerHTML = currentUserDescription
    ? `<em>"${currentUserDescription}"</em>`
    : '<em>No description yet.</em>';

  const promptText = currentUserDescription
    ? currentPreset.buildPrompt(currentUserDescription)
    : currentPreset.buildPrompt('a simple 3D scene with some objects');
  promptPreview.textContent = promptText;
}

// Populate preset dropdown
presets.forEach((p) => {
  const option = document.createElement('option');
  option.value = p.id;
  option.textContent = p.label;
  presetSelect.appendChild(option);
});

presetSelect.addEventListener('change', () => {
  const selected = presets.find((p) => p.id === presetSelect.value);
  if (selected) {
    currentPreset = selected;
    updateModeratorPanel();
  }
});

// ─── Structured Presets ───────────────────────────────────────────────────

structuredPresets.forEach((p) => {
  const option = document.createElement('option');
  option.value = p.id;
  option.textContent = p.label;
  structuredPresetSelect.appendChild(option);
});

structuredPresetSelect.addEventListener('change', () => {
  const preset = structuredPresets.find((p) => p.id === structuredPresetSelect.value);
  if (preset) {
    structuredInput.value = preset.content;
    structuredSubmitBtn.disabled = false;
  }
});

structuredInput.addEventListener('input', () => {
  structuredSubmitBtn.disabled = structuredInput.value.trim().length === 0;
});

copyPromptBtn.addEventListener('click', async () => {
  const text = promptPreview.textContent ?? '';
  try {
    await navigator.clipboard.writeText(text);
    copyPromptBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyPromptBtn.textContent = 'Copy Prompt'; }, 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyPromptBtn.textContent = '✓ Copied!';
    setTimeout(() => { copyPromptBtn.textContent = 'Copy Prompt'; }, 2000);
  }
});

validateJsonBtn.addEventListener('click', () => {
  const raw = jsonPasteArea.value.trim();
  if (!raw) {
    validationResult.className = 'validation-box error';
    validationResult.textContent = 'Paste some JSON first.';
    renderSceneBtn.disabled = true;
    return;
  }

  const result = validateSceneJSON(raw);
  validatedSchema = result.valid ? result.schema : null;

  validationResult.className = `validation-box ${result.valid ? 'success' : 'error'}`;
  validationResult.textContent = formatValidationErrors(result);
  renderSceneBtn.disabled = !result.valid;
});

renderSceneBtn.addEventListener('click', () => {
  if (!validatedSchema) {
    validateJsonBtn.click();
    if (!validatedSchema) return;
  }
  buildSceneFromSchema(rendererState.scene, validatedSchema);
  applySceneCamera();
  statusMsg.textContent = '✅ Scene rendered from LLM output!';
  statusMsg.className = 'status-success';
  saveRenderToHistory(validatedSchema, jsonPasteArea.value);
});

// ─── Structured Mode ───────────────────────────────────────────────────────

structuredSubmitBtn.addEventListener('click', () => {
  const input = structuredInput.value.trim();
  if (!input) return;

  const result = parseStructured(input);

  if (result.errors.length > 0) {
    statusMsg.textContent = `⚠️  ${result.errors.join('; ')}`;
    statusMsg.className = 'status-error';
  } else {
    statusMsg.textContent = '✅ Scene generated from structured input!';
    statusMsg.className = 'status-success';
  }

  buildSceneFromSchema(rendererState.scene, result.schema);
  applySceneCamera();
  saveRenderToHistory(result.schema, structuredInput.value);
});

// ─── History ────────────────────────────────────────────────────────────────

/** Render a frame and capture a screenshot for history. */
function saveRenderToHistory(schema: Partial<SceneSchema>, description: string): void {
  rendererState.renderer.render(rendererState.scene, rendererState.camera);
  const dataUrl = rendererState.renderer.domElement.toDataURL('image/png');
  saveToHistory({ schema, screenshotDataUrl: dataUrl, description });
  refreshHistoryUI();
}

/** Refresh the history list in the sidebar. */
function refreshHistoryUI(): void {
  const entries = getHistory();
  currentHistoryId = entries.length > 0 ? entries[0].id : null;

  historyEmpty.style.display = entries.length === 0 ? 'block' : 'none';

  // Remove old entry elements (keep the empty placeholder)
  historyList.querySelectorAll('.history-entry').forEach((el) => { el.remove(); });

  // Update back button
  const backBtn = document.querySelector<HTMLButtonElement>('button[data-action="back"]');
  if (backBtn) {
    backBtn.disabled = entries.length < 2;
  }

  // Render entries
  for (const entry of entries) {
    const card = document.createElement('div');
    card.className = 'history-entry';
    if (entry.id === currentHistoryId) card.classList.add('active');

    const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const desc = entry.description.slice(0, 60) + (entry.description.length > 60 ? '…' : '');

    card.innerHTML = `
      <img src="${entry.screenshotDataUrl}" alt="Render thumbnail" class="history-thumb" />
      <div class="history-meta">
        <span class="history-time">${time}</span>
        <span class="history-desc">${desc || 'No description'}</span>
      </div>
      <button class="history-del" data-id="${entry.id}" title="Delete">✕</button>
    `;

    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('history-del')) return;
      loadHistoryEntry(entry.id);
    });

    const delBtn = card.querySelector('.history-del') as HTMLButtonElement;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFromHistory(entry.id);
      refreshHistoryUI();
    });

    historyList.appendChild(card);
  }
}

/** Load a scene from a history entry. */
function loadHistoryEntry(id: string): void {
  const entries = getHistory();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;

  currentHistoryId = id;
  buildSceneFromSchema(rendererState.scene, entry.schema);
  applySceneCamera();
  statusMsg.textContent = `⏪ Loaded render from ${new Date(entry.timestamp).toLocaleTimeString()}`;
  statusMsg.className = 'status-success';
  refreshHistoryUI();
}

// ─── Clear History ──────────────────────────────────────────────────────────

historyClearBtn.addEventListener('click', () => {
  clearHistory();
  currentHistoryId = null;
  refreshHistoryUI();
});

// ─── Scene Controls ────────────────────────────────────────────────────────

document.querySelectorAll('#scene-controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = (btn as HTMLElement).dataset.action;
    switch (action) {
      case 'back': {
        const entries = getHistory();
        if (entries.length < 2) break;
        const currentIdx = entries.findIndex((e) => e.id === currentHistoryId);
        // Go back one entry (next in the list, which is older)
        const nextIdx = currentIdx >= 0 ? currentIdx + 1 : 1;
        if (nextIdx < entries.length) {
          loadHistoryEntry(entries[nextIdx].id);
        }
        break;
      }
      case 'reset-camera':
        rendererState.camera.position.set(12, 8, 12);
        rendererState.controls.target.set(0, 0, 0);
        rendererState.controls.update();
        break;
      case 'wireframe':
        rendererState.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.wireframe = !m.wireframe;
              }
            });
          }
        });
        break;
      case 'axes': {
        const axes = rendererState.scene.getObjectByName('__axes_helper__');
        if (axes) {
          rendererState.scene.remove(axes);
        } else {
          const helper = new THREE.AxesHelper(5);
          helper.name = '__axes_helper__';
          rendererState.scene.add(helper);
        }
        break;
      }
      case 'grid': {
        const grid = rendererState.scene.getObjectByName('__grid_helper__');
        if (grid) {
          rendererState.scene.remove(grid);
        } else {
          const helper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
          helper.name = '__grid_helper__';
          rendererState.scene.add(helper);
        }
        break;
      }
      case 'screenshot': {
        rendererState.renderer.render(rendererState.scene, rendererState.camera);
        const link = document.createElement('a');
        link.download = 'scene-screenshot.png';
        link.href = rendererState.renderer.domElement.toDataURL('image/png');
        link.click();
        break;
      }
    }
  });
});

// ─── Initial preset render ─────────────────────────────────────────────────

updateModeratorPanel();
