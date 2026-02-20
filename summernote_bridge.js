// This script runs in the 'MAIN' world
console.log('Scilympiad Automation: Bridge script loaded in MAIN world.');

// HELPER: Highlight an element (Visual Debugging)
function highlight(el, color = 'blue') {
    if (!el) return;
    const original = el.style.border;
    el.style.border = `5px solid ${color}`;
    setTimeout(() => el.style.border = original, 1000);
}

window.addEventListener('scilympiad-action', function (e) {
    const data = e.detail;
    // console.log('Bridge: Action received', data.action, data);

    try {
        if (typeof $ === 'undefined') {
            console.warn('Bridge: jQuery ($) is undefined. Some automation features will be skipped.');
            // Do not return, as 'inject' might still work with native DOM
        }

        // --- ACTION: SCAN & DEBUG ---
        if (data.action === 'scan') {
            const editables = (typeof $ !== 'undefined') ? $('.note-editable') : document.querySelectorAll('.note-editable');
            console.log(`Bridge SCAN: Found ${editables.length} Summernote editors.`);

            // Visual Flash
            if (typeof $ !== 'undefined') {
                $(editables).css('border', '5px solid orange');
                setTimeout(() => $(editables).css('border', ''), 1000);
            } else {
                editables.forEach(el => {
                    el.style.border = '5px solid orange';
                    setTimeout(() => el.style.border = '', 1000);
                });
            }
        }

        // --- ACTION: CHANGE TYPE ---
        if (data.action === 'change-type') {
            if (typeof $ !== 'undefined') {
                const val = data.value;
                const $select = $('select#Type, select[name="Type"]');
                if ($select.length > 0) {
                    console.log(`Bridge: Changing Type to ${val} using jQuery...`);
                    // We must change val, then trigger change
                    if ($select.val() != val) {
                        $select.val(val).trigger('change');
                    }
                }
            }
        }

        // --- ACTION: INJECT ---
        if (data.action === 'inject') {
            const editables = document.querySelectorAll('.note-editable');
            const index = (typeof data.index === 'number') ? data.index : 0;

            if (index < editables.length) {
                const target = editables[index];

                // Visual feedback
                target.style.border = '5px solid blue'; // Blue = Active Write
                setTimeout(() => target.style.border = '', 500);

                // ROBUST FOCUS STRATEGY
                // 1. Focus the element
                target.focus();

                // 2. Force Selection Range to the end of the element
                // This ensures execCommand acts on THIS element, not the previous one
                try {
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    range.collapse(false); // Collapse to end
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                } catch (e) {
                    console.warn('Bridge: Could not set selection range', e);
                }

                // 3. Try native execCommand (simulates paste)
                // This is preferred because it handles Summernote's internal state better than innerHTML
                const success = document.execCommand('insertHTML', false, data.content);

                // 4. Fallback if execCommand fails (or if browser blocks it)
                if (!success) {
                    // console.log('Bridge: execCommand failed, falling back to innerHTML');
                    // Check if content is already there (race condition)
                    if (target.innerHTML !== data.content) {
                        target.innerHTML = data.content;
                        // Note: innerHTML might kill Summernote's event bindings, but usually fine for simple text
                        // Adding a wrapper div sometimes helps Summernote
                        // target.innerHTML = `<div>${data.content}</div>`;
                    }
                }

                // Dispatch standard and custom events
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                target.dispatchEvent(new Event('blur', { bubbles: true }));

                // jQuery Fallback trigger (if available) - Critical for some validation
                if (typeof $ !== 'undefined') {
                    $(target).trigger('summernote.change', [target.innerHTML]);
                    $(target).trigger('keyup');
                }

            } else {
                console.warn(`Bridge: Target #${index} not found. Found ${editables.length}.`);
                // Only alert on options failure if we really expected them
                if (index > 0) {
                    // console.warn/alert
                }
            }
        }

    } catch (err) {
        console.error('Bridge Error:', err);
    }
});
