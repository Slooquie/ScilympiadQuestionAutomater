function createRow(q, index) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    // Index
    const tdIndex = document.createElement('td');
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // Type Selector
    const tdType = document.createElement('td');
    const typeSelect = document.createElement('select');
    typeSelect.className = 'q-type';
    typeSelect.style.width = '100%';
    typeSelect.style.padding = '5px';
    ['multiple_choice', 'short_answer'].forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.text = val === 'short_answer' ? 'Short Answer/Essay' : 'Multiple Choice';
        typeSelect.add(opt);
    });

    const initialType = (q.type === 'short_answer' || q.type === 'free_response') ? 'short_answer' : 'multiple_choice';
    typeSelect.value = initialType;
    tdType.appendChild(typeSelect);
    tr.appendChild(tdType);

    // Question Text & Image
    const tdQ = document.createElement('td');
    const taQ = document.createElement('textarea');
    taQ.value = q.question_text || '';
    taQ.className = 'q-text';
    tdQ.appendChild(taQ);

    // Image Upload UI
    const imgContainer = document.createElement('div');
    imgContainer.style.marginTop = '10px';
    imgContainer.style.border = q.requires_image ? '2px dashed #dc3545' : '1px solid transparent'; // Highlight if needed
    imgContainer.style.padding = '5px';
    imgContainer.style.borderRadius = '5px';
    if (q.requires_image) imgContainer.title = "AI detected this question needs an image!";

    // Hidden File Input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.className = 'q-img-input';

    // Preview Img
    const imgPreview = document.createElement('img');
    imgPreview.className = 'q-img-preview';
    imgPreview.style.maxWidth = '100px';
    imgPreview.style.maxHeight = '100px';
    imgPreview.style.display = q.image ? 'block' : 'none';
    if (q.image) imgPreview.src = q.image;

    // Add Image Button
    const addImgBtn = document.createElement('button');
    addImgBtn.textContent = q.image ? 'Change Image' : (q.requires_image ? '⚠️ Add Image (Expected)' : 'Add Image');
    addImgBtn.className = q.requires_image ? 'btn-danger' : 'btn-secondary';
    addImgBtn.style.padding = '5px 10px';
    addImgBtn.style.fontSize = '12px';
    addImgBtn.onclick = () => fileInput.click();

    // Remove Image Button
    const removeImgBtn = document.createElement('button');
    removeImgBtn.textContent = 'Remove';
    removeImgBtn.className = 'btn-danger';
    removeImgBtn.style.padding = '5px 10px';
    removeImgBtn.style.fontSize = '12px';
    removeImgBtn.style.marginLeft = '5px';
    removeImgBtn.style.display = q.image ? 'inline-block' : 'none';
    removeImgBtn.onclick = () => {
        imgPreview.src = '';
        imgPreview.style.display = 'none';
        fileInput.value = '';
        addImgBtn.textContent = 'Add Image';
        if (q.requires_image) {
            addImgBtn.className = 'btn-danger';
            addImgBtn.textContent = '⚠️ Add Image (Expected)';
        }
        removeImgBtn.style.display = 'none';
    };

    // Label for Paste
    const pasteLabel = document.createElement('div');
    pasteLabel.textContent = 'or Ctrl+V to paste';
    pasteLabel.style.fontSize = '10px';
    pasteLabel.style.color = '#6c757d';
    pasteLabel.style.marginTop = '2px';

    // File Change Handler
    const handleFile = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            imgPreview.src = ev.target.result;
            imgPreview.style.display = 'block';
            addImgBtn.textContent = 'Change Image';
            addImgBtn.className = 'btn-secondary';
            removeImgBtn.style.display = 'inline-block';
            imgContainer.style.border = '1px solid transparent';
        };
        reader.readAsDataURL(file);
    };

    fileInput.onchange = (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    };

    // Paste Handle
    tdQ.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.includes('image/')) {
                const blob = item.getAsFile();
                handleFile(blob);
                e.preventDefault(); // Prevent pasting the binary string into text area
            }
        }
    });

    imgContainer.appendChild(fileInput);
    imgContainer.appendChild(imgPreview);
    imgContainer.appendChild(document.createElement('br'));
    imgContainer.appendChild(addImgBtn);
    imgContainer.appendChild(removeImgBtn);
    imgContainer.appendChild(pasteLabel);

    tdQ.appendChild(imgContainer);
    tr.appendChild(tdQ);

    // Options & Correct Answer
    const tdOpt = document.createElement('td');

    const renderOptionsUI = () => {
        tdOpt.innerHTML = '';
        if (typeSelect.value === 'short_answer') {
            const label = document.createElement('div');
            label.textContent = "Answer Key / Rubric:";
            label.style.fontSize = "12px";
            label.style.fontWeight = "bold";
            const ta = document.createElement('textarea');
            ta.className = 'q-correct-text';
            ta.value = q.correct_answer || '';
            ta.placeholder = "Enter the expected answer key here...";
            tdOpt.appendChild(label);
            tdOpt.appendChild(ta);
        } else {
            const optContainer = document.createElement('div');
            optContainer.className = 'options-container';

            const options = (q.options && q.options.length > 0) ? q.options : ['', '', '', ''];

            options.forEach((optText, i) => {
                const div = document.createElement('div');
                div.className = 'option-row';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `correct_q${index}`; // Group by question
                radio.value = i;
                radio.className = 'correct-radio';

                let isCorrect = false;
                if (q.correct_answer) {
                    if (q.correct_answer.length === 1 && q.correct_answer.match(/[A-Z]/i)) {
                        const charCode = q.correct_answer.toUpperCase().charCodeAt(0) - 65;
                        if (charCode === i) isCorrect = true;
                    } else if (optText && q.correct_answer.includes(optText)) {
                        isCorrect = true;
                    }
                }
                if (isCorrect) radio.checked = true;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = optText;
                input.style.flex = "1";
                input.style.padding = "5px";
                input.className = 'opt-text';

                const delOpt = document.createElement('button');
                delOpt.textContent = 'x';
                delOpt.className = 'btn-danger';
                delOpt.style.padding = '2px 6px';
                delOpt.style.marginLeft = '5px';
                delOpt.onclick = () => div.remove();

                div.appendChild(radio);
                div.appendChild(input);
                div.appendChild(delOpt);
                optContainer.appendChild(div);
            });

            const addOptBtn = document.createElement('button');
            addOptBtn.textContent = '+ Add Option';
            addOptBtn.className = 'btn-secondary';
            addOptBtn.style.marginTop = '5px';
            addOptBtn.style.fontSize = '12px';
            addOptBtn.onclick = () => {
                const div = document.createElement('div');
                div.className = 'option-row';
                div.innerHTML = `<input type="radio" name="correct_q${index}" class="correct-radio" value="${optContainer.children.length - 1}">
                                 <input type="text" style="flex:1; padding:5px;" class="opt-text">
                                 <button class="btn-danger" style="padding:2px 6px; margin-left:5px;" onclick="this.parentElement.remove()">x</button>`;
                optContainer.insertBefore(div, addOptBtn);
            };

            optContainer.appendChild(addOptBtn);
            tdOpt.appendChild(optContainer);
        }
    };

    renderOptionsUI();
    typeSelect.onchange = renderOptionsUI;

    tr.appendChild(tdOpt);

    // Points
    const tdPts = document.createElement('td');
    const inpPts = document.createElement('input');
    inpPts.type = 'number';
    inpPts.value = q.points || 1;
    inpPts.className = 'q-points';
    tdPts.appendChild(inpPts);
    tr.appendChild(tdPts);

    // Actions
    const tdAct = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'btn-danger';
    delBtn.title = 'Delete Question';
    delBtn.onclick = () => tr.remove();
    tdAct.appendChild(delBtn);
    tr.appendChild(tdAct);

    return tr;
}

function loadData() {
    try {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            console.error("Storage API not available. Retrying...");
            setTimeout(loadData, 500);
            return;
        }

        chrome.storage.local.get(['scilympiadTestData'], function (result) {
            if (chrome.runtime.lastError) {
                console.error("Storage error:", chrome.runtime.lastError);
                setTimeout(loadData, 500); // Retry
                return;
            }

            let data = result.scilympiadTestData || [];

            // Auto-correct if the AI returns an object like { "questions": [...] }
            if (data && !Array.isArray(data)) {
                const keys = Object.keys(data);
                for (let k of keys) {
                    if (Array.isArray(data[k])) {
                        data = data[k];
                        break;
                    }
                }
            }

            if (!Array.isArray(data)) data = []; // Final fallback

            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';

            document.getElementById('status').textContent = `Loaded ${data.length} questions.`;

            data.forEach((q, i) => {
                tbody.appendChild(createRow(q, i));
            });
        });
    } catch (e) {
        console.error("loadData exception:", e);
        setTimeout(loadData, 500);
    }
}

function saveDataAndLaunch() {
    const rows = document.querySelectorAll('#tableBody tr');
    const newData = [];

    rows.forEach((tr, i) => {
        const qText = tr.querySelector('.q-text').value;
        const points = tr.querySelector('.q-points').value;
        const qImg = tr.querySelector('.q-img-preview').src; // Get Base64 if present, else empty (or current page URL if #)

        // Check if qImg is actually data:image
        let finalImg = null;
        if (qImg && qImg.startsWith('data:image')) {
            finalImg = qImg;
        }

        const options = [];
        let cleanCorrectAnswer = null;

        const optRows = tr.querySelectorAll('.option-row');
        optRows.forEach((div, optIndex) => {
            const txt = div.querySelector('.opt-text').value;
            const radio = div.querySelector('.correct-radio');

            if (txt.trim()) {
                options.push(txt);
                // If checked, map back to a letter (A, B, C...) or the text itself?
                if (radio && radio.checked) {
                    cleanCorrectAnswer = String.fromCharCode(65 + options.length - 1); // 0->A, 1->B
                }
            }
        });

        const qTypeSelect = tr.querySelector('.q-type');
        const qType = qTypeSelect ? qTypeSelect.value : (q.type || "multiple_choice");
        if (qType === 'short_answer') {
            const ta = tr.querySelector('.q-correct-text');
            if (ta) cleanCorrectAnswer = ta.value;
        }

        newData.push({
            question_number: i + 1,
            question_text: qText,
            image: finalImg,
            points: points,
            type: qType,
            options: qType === 'short_answer' ? null : options,
            correct_answer: cleanCorrectAnswer
        });
    });

    // Save to storage
    chrome.storage.local.set({ scilympiadTestData: newData }, function () {
        // Reset state for the automator but do NOT start automatically
        chrome.storage.local.set({ scilympiadLoopState: { isRunning: false, currentIndex: 0 } }, function () {
            // Open Scilympiad
            window.open('https://scilympiad.com/rosecity/Es/TQuestion', '_blank');
            window.close(); // Close preview
        });
    });
}

function initPreview() {
    if (window._previewInitialized) return;
    window._previewInitialized = true;

    loadData();

    document.getElementById('saveAndLaunchBtn').addEventListener('click', saveDataAndLaunch);

    document.getElementById('addRowBtn').addEventListener('click', () => {
        const tbody = document.getElementById('tableBody');
        const index = tbody.children.length;
        tbody.appendChild(createRow({ question_text: '', options: ['', '', '', ''], points: 1 }, index));
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data?')) {
            document.getElementById('tableBody').innerHTML = '';
        }
    });

    // Auto-reload data if storage changes late after window.open
    if (chrome && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.scilympiadTestData) {
                console.log("Storage updated, reloading preview...");
                loadData();
            }
        });
    }
}

// Robust bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreview);
} else {
    initPreview();
}

// Ultimate fallback if it fails silently
setTimeout(() => {
    const statusEl = document.getElementById('status');
    if (statusEl && statusEl.textContent.includes('Loading data')) {
        console.warn('Fallback: Data still loading, forcing retry...');
        loadData();
    }
}, 2000);
