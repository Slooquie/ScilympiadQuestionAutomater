function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Scilympiad Automator: Content script loaded.');
document.body.style.border = "5px solid red";

// DISPATCHER
function bridgeAction(action, payload = {}) {
    window.dispatchEvent(new CustomEvent('scilympiad-action', {
        detail: { action: action, ...payload }
    }));
}

// WAIT HELPER
async function waitForOptionsToLoad(minCount) {
    console.log(`Automator: Waiting for ${minCount} editors...`);
    for (let i = 0; i < 20; i++) { // 10 seconds max
        bridgeAction('scan');
        const visibleEditors = document.querySelectorAll('.note-editable').length;
        if (visibleEditors >= minCount) return true;
        await delay(500);
    }
    return false;
}

// UI HELPER
function createUI(statusText, onStop) {
    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '10px', right: '10px', zIndex: '2147483647', display: 'flex', gap: '10px' });

    const info = document.createElement('div');
    info.textContent = statusText;
    Object.assign(info.style, { padding: '10px', backgroundColor: 'black', color: 'white', fontWeight: 'bold', borderRadius: '5px' });

    const stopBtn = document.createElement('button');
    stopBtn.textContent = "STOP / RESET";
    Object.assign(stopBtn.style, { padding: '10px 15px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#dc3545', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer' });
    stopBtn.onclick = onStop;

    container.appendChild(info);
    container.appendChild(stopBtn);
    document.body.appendChild(container);
    return container;
}

// MAIN LOGIC
async function processQuestion(q, uiInfoRef) {
    console.log(`Automator: Processing Question ${q.question_number}`, q);

    // 1. Add Question
    const addBtn = Array.from(document.querySelectorAll('*')).find(el =>
        el.textContent && (el.textContent.trim().toLowerCase() === 'add question' || el.textContent.trim().toLowerCase() === 'add new question')
    );
    if (addBtn && addBtn.tagName !== 'SCRIPT') {
        addBtn.click();
        await delay(2000); // Wait for form to appear/slide down
    }

    // 2. Select Multiple Choice using BRIDGE
    let typeValue = '3';
    const frameSelect = document.querySelector('select#Type');
    if (frameSelect) {
        for (let opt of frameSelect.options) {
            if (opt.text.toLowerCase().includes('multiple choice') || opt.text.toLowerCase().includes('multiple answers')) {
                typeValue = opt.value;
                break;
            }
        }
    }
    bridgeAction('change-type', { value: typeValue });

    // 3. Wait for options
    const requiredEditors = 1 + (q.options ? q.options.length : 0);
    const ready = await waitForOptionsToLoad(requiredEditors);
    if (!ready) console.warn(`Automator: Wanted ${requiredEditors} editors, but found fewer. The page says '6 boxes appear automatically', so we proceed.`);

    // 4. Inject
    const cleanText = (text) => {
        if (!text) return "";
        let t = text.trim();
        t = t.replace(/^[A-Z][\.\)\:]\s*/i, '');
        if (t.endsWith(',')) t = t.slice(0, -1);
        return t.trim();
    };

    bridgeAction('inject', { content: cleanText(q.question_text), index: 0 });

    // Inject Image if present
    if (q.image) {
        await delay(300);
        // We append the image to the same editor (index 0)
        // Note: We use 'insertHTML' often, calling it twice appends.
        const imgHtml = `<br><img src="${q.image}" style="max-width: 100%; margin-top: 10px;">`;
        bridgeAction('inject', { content: imgHtml, index: 0 });
    }

    await delay(500); // Increased initial delay for safety

    if (q.options) {
        for (let j = 0; j < q.options.length; j++) {
            bridgeAction('inject', { content: cleanText(q.options[j]), index: j + 1 });
            await delay(400); // Increased delay per option (was 200)
        }
    }

    // Points 
    const pointsInput = document.querySelector('input[name*="Point"], input[name*="Value"]');
    if (pointsInput) pointsInput.value = q.points;

    // 5. Correct Answer
    let answerInputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]')).filter(el => {
        const wrapper = el.closest('label') || el.closest('div') || el.parentElement;
        return wrapper && wrapper.textContent.includes('option is correct');
    });

    if (answerInputs.length === 0) {
        const answersHeader = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Specify up to 6 answers'));
        if (answersHeader) {
            const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
            answerInputs = allRadios.filter(el => el.compareDocumentPosition(answersHeader) & Node.DOCUMENT_POSITION_PRECEDING);
        }
    }

    if (q.correct_answer && answerInputs.length > 0) {
        let idx = -1;
        if (q.correct_answer.match(/^[A-F]$/i)) {
            idx = q.correct_answer.toUpperCase().charCodeAt(0) - 65;
        } else {
            const cleanAns = cleanText(q.correct_answer).toLowerCase();
            idx = q.options.findIndex(o => cleanText(o).toLowerCase() === cleanAns);
        }

        if (idx >= 0 && idx < answerInputs.length) {
            const target = answerInputs[idx];
            const label = target.closest('label');
            if (label) label.click(); else target.click();
        }
    }

    // 6. Save
    const saveBtn = Array.from(document.querySelectorAll('button, input[type="submit"], .btn')).find(el => {
        if (el.offsetParent === null) return false;
        const t = el.textContent ? el.textContent.toLowerCase() : '';
        const v = el.value ? el.value.toLowerCase() : '';
        return (t.includes('save') && !t.includes('cancel')) || (v.includes('save'));
    });

    if (saveBtn) {
        uiInfoRef.textContent = "Saving...";
        saveBtn.click();
        // Do NOT await here indefinitely. The page might reload.
        // We will increment index in main loop and rely on reload or short wait.
    } else {
        console.error("Automator: Save button failed.");
    }
}

// BOOTSTRAP
chrome.storage.local.get(['scilympiadTestData', 'scilympiadLoopState'], async function (result) {
    const data = result.scilympiadTestData;
    let state = result.scilympiadLoopState || { isRunning: false, currentIndex: 0 };

    // Reset handler
    const stopAndReset = () => {
        chrome.storage.local.set({ scilympiadLoopState: { isRunning: false, currentIndex: 0 } });
        alert('Automation Stopped and Reset.');
        window.location.reload();
    };

    if (state.isRunning && data && state.currentIndex < data.length) {
        // --- AUTO RESUME MODE ---
        const q = data[state.currentIndex];
        const ui = createUI(`Processing Q${state.currentIndex + 1} / ${data.length}`, stopAndReset);

        // Wait a moment for page settle
        await delay(1000);

        try {
            await processQuestion(q, ui.firstChild);

            // Increment State
            state.currentIndex++;
            chrome.storage.local.set({ scilympiadLoopState: state }, () => {
                // After saving state, we wait.
                // If page reloads -> script runs again -> picks up next index.
                // If page DOES NOT reload (SPA) -> we need to manually reload or trigger next.

                // Fallback for SPA: If we are still here after 5 seconds, reload the page to be safe force a refresh
                setTimeout(() => {
                    console.log('Automator: Page did not reload automatically. Forcing reload to process next question.');
                    window.location.reload();
                }, 5000);
            });
        } catch (err) {
            console.error(err);
            ui.firstChild.textContent = "Error! See Console.";
        }

    } else if (data && data.length > 0) {
        // --- IDLE START MODE ---
        const container = document.createElement('div');
        Object.assign(container.style, { position: 'fixed', top: '10px', right: '10px', zIndex: '2147483647', display: 'flex', gap: '10px' });

        const btn = document.createElement('button');
        btn.textContent = `Start Upload (${data.length} Qs)`;
        Object.assign(btn.style, { padding: '10px 15px', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#d63384', color: 'white', border: '2px solid white', borderRadius: '5px', cursor: 'pointer' });

        btn.onclick = () => {
            // Self-Healing: Check if extension context is still valid
            try {
                if (!chrome.runtime || !chrome.runtime.id) throw new Error("Extension invalidated");

                // Initialize Loop
                chrome.storage.local.set({
                    scilympiadLoopState: { isRunning: true, currentIndex: 0 }
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn("Context invalid during set. Reloading.");
                        window.location.reload();
                        return;
                    }
                    window.location.reload(); // Force reload to start fresh
                });
            } catch (e) {
                console.warn("Extension context invalidated (Reload detected). Refreshing page to restore connection.");
                window.location.reload();
            }
        };

        const clearBtn = document.createElement('button');
        clearBtn.textContent = "Clear Data";
        Object.assign(clearBtn.style, { padding: '5px', fontSize: '10px', backgroundColor: '#6c757d', color: 'white' });
        clearBtn.onclick = () => {
            try {
                if (!chrome.runtime || !chrome.runtime.id) { window.location.reload(); return; }
                chrome.storage.local.remove('scilympiadTestData', () => {
                    window.location.reload();
                });
            } catch (e) { window.location.reload(); }
        };

        container.appendChild(btn);
        container.appendChild(clearBtn);
        document.body.appendChild(container);
    } else {
        // No data, do nothing or show "Ready"
    }
});
