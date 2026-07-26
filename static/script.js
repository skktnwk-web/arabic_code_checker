document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const textInput = document.getElementById('text-input');
    const resultsDisplay = document.getElementById('results-display');
    const allCharCodesDisplay = document.getElementById('all-char-codes-display');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const languageRadios = document.getElementsByName('language');
    const correctedTextOutput = document.getElementById('corrected-text-output');
    const copyCorrectedBtn = document.getElementById('copy-corrected-btn');
    const fixAllBtn = document.getElementById('fix-all-btn');

    // Simplified rules: combine previous `error` and `warning` maps into a single `issues` map
    // Web UI does not differentiate categories, so a single lookup keeps data smaller and clearer.
    const LANGUAGE_RULES = {
        Persian: {
            issues: {
                'ي': 'Arabic Yeh (U+064A) is normally replaced by Farsi Yeh (U+06CC)',
                'ك': 'Arabic Kaf (U+0643) is normally replaced by Keheh (U+06A9)',
                'ى': 'Arabic Alef Maqsura (U+0649) is not used in Persian',
                'ۀ': 'Heh with Yeh above (U+06C0) is context-dependent',
                'ة': 'Teh Marbuta (U+0629) is rare in Persian and usually replaced by Heh',
                'ؤ': 'Waw with Hamza above is usually Arabic-origin vocabulary',
                'ئ': 'Yeh with Hamza above is usually Arabic-origin vocabulary'
            },
            replacement: {
                'ي': 'ی',
                'ك': 'ک',
                'ى': 'ی',
                'ة': 'ه'
            }
        },
        Arabic: {
            issues: {
                'پ': 'Peh (U+067E) is not used in Arabic',
                'چ': 'Tcheh (U+0686) is not used in Arabic',
                'ژ': 'Jeh (U+0698) is not used in Arabic',
                'گ': 'Gaf (U+06AF) is not used in Arabic',
                'ی': 'Farsi Yeh (U+06CC) should be Arabic Yeh (U+064A)',
                'ک': 'Keheh (U+06A9) should be Arabic Kaf (U+0643)',
                'ڤ': 'Veh (U+06A4) appears only in loanwords in Arabic',
                'ـ': 'Tatweel (Kashida) should not be used in normalized Arabic text',
                '‌': 'Zero-width non-joiner may affect searching and normalization'
            },
            replacement: {
                'پ': 'ب',
                'چ': 'ج',
                'ژ': 'ز',
                'گ': 'ك',
                'ی': 'ي',
                'ک': 'ك'
            }
        }
    };

    const GLOBAL_ISSUE_RANGES = [
        { start: 0xFB50, end: 0xFDFF, name: 'Arabic Presentation Forms-A' },
        { start: 0xFE70, end: 0xFEFF, name: 'Arabic Presentation Forms-B' }
    ];

    const GLOBAL_ISSUE_REASON = 'The use of characters in the Arabic Presentation Forms block should be avoided.';

    const GLOBAL_ISSUE_NAMES = {
        // If specific glyph names are needed, add them here with U+NNNN keys.
    };

    const UNICODE_NAMES = {
        'ي': 'Arabic Yeh (U+064A)',
        'ی': 'Farsi Yeh (U+06CC)',
        'ك': 'Arabic Kaf (U+0643)',
        'ک': 'Keheh (U+06A9)',
        'ى': 'Arabic Alef Maqsura (U+0649)',
        'ة': 'Teh Marbuta (U+0629)',
        'ۀ': 'Heh with Yeh above (U+06C0)',
        'ؤ': 'Waw with Hamza above (U+0624)',
        'ئ': 'Yeh with Hamza above (U+0626)',
        'پ': 'Peh (U+067E)',
        'چ': 'Tcheh (U+0686)',
        'ژ': 'Jeh (U+0698)',
        'گ': 'Gaf (U+06AF)',
        'ڤ': 'Veh (U+06A4)',
        'ـ': 'Tatweel (Kashida, U+0640)',
        '‌': 'Zero-width non-joiner (U+200C)'
    };

    let currentResults = [];
    let appliedFixes = new Set();

    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('test');
    if (testParam) {
        textInput.value = decodeURIComponent(testParam);
        setTimeout(performAnalysis, 100);
    }

    analyzeBtn?.addEventListener('click', performAnalysis);
    clearBtn?.addEventListener('click', clearAll);
    textInput?.addEventListener('keydown', handleTextInputKeydown);
    textInput?.addEventListener('input', clearIfEmpty);
    copyCorrectedBtn?.addEventListener('click', copyCorrectedText);
    fixAllBtn?.addEventListener('click', handleFixAll);

    function clearAll() {
        textInput.value = '';
        resultsDisplay.innerHTML = '<span class="placeholder-text">Analysis highlights will appear here...</span>';
        allCharCodesDisplay.innerHTML = '<span class="placeholder-text">Character code breakdown will appear here...</span>';
        resultsTableBody.innerHTML = '';
        currentResults = [];
        appliedFixes.clear();
        correctedTextOutput.value = '';
    }

    function handleTextInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performAnalysis();
        }
    }

    function clearIfEmpty() {
        if (!textInput.value) {
            clearAll();
        }
    }

    function copyCorrectedText() {
        if (!correctedTextOutput || !correctedTextOutput.value) return;
        correctedTextOutput.select();
        navigator.clipboard.writeText(correctedTextOutput.value).catch(() => {});
    }

    function handleFixAll() {
        if (!currentResults || currentResults.length === 0) return;

        const fixableIndices = currentResults
            .map((item, idx) => item.suggestion ? idx : null)
            .filter(idx => idx !== null);

        const allApplied = fixableIndices.every(idx => appliedFixes.has(idx));
        if (allApplied) {
            appliedFixes.clear();
        } else {
            fixableIndices.forEach(idx => appliedFixes.add(idx));
        }

        renderTable(currentResults);
        updateCorrectedText();
        updateFixAllButtonLabel();
    }

    function updateFixAllButtonLabel() {
        if (!currentResults || currentResults.length === 0) {
            fixAllBtn.textContent = 'Fix All';
            fixAllBtn.classList.remove('secondary-btn');
            fixAllBtn.classList.add('fix-action-btn');
            return;
        }
        const fixableIndices = currentResults
            .map((item, idx) => item.suggestion ? idx : null)
            .filter(idx => idx !== null);
        if (fixableIndices.length > 0 && fixableIndices.every(idx => appliedFixes.has(idx))) {
            // All fixes applied -> show Undo (gray)
            fixAllBtn.textContent = 'Undo';
            fixAllBtn.classList.remove('fix-action-btn');
            fixAllBtn.classList.add('secondary-btn');
        } else {
            // Some or none applied -> show Fix All (blue)
            fixAllBtn.textContent = 'Fix All';
            fixAllBtn.classList.remove('secondary-btn');
            fixAllBtn.classList.add('fix-action-btn');
        }
    }

    // initialize Fix All button style
    updateFixAllButtonLabel();

    function performAnalysis() {
        const text = textInput.value;
        if (!text) return;

        let selectedLang = 'Arabic';
        for (const radio of languageRadios) {
            if (radio.checked) {
                selectedLang = radio.value;
                break;
            }
        }

        currentResults = analyzeText(text, selectedLang);
        // Do not auto-apply fixes after analysis; keep corrected text unmodified by default.
        appliedFixes.clear();

        updateFixAllButtonLabel();

        renderResults(text, currentResults);
        renderTable(currentResults);
        renderAllCharCodes(text);
        updateCorrectedText();
    }

    function analyzeText(text, language) {
        const rules = LANGUAGE_RULES[language] || LANGUAGE_RULES.Persian;
        // single map for any issue (previously split into `error`/`warning` in the server-side code)
        const issueChars = rules.issues || {};
        const replacements = rules.replacement || {};
        const results = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const cp = char.codePointAt(0);
            const hexCode = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
            let reason = null;
            let suggestion = null;
            let pushed = false;

            if (Object.prototype.hasOwnProperty.call(issueChars, char)) {
                reason = issueChars[char];
                suggestion = replacements[char] || null;
                const name = getUnicodeName(char, hexCode);
                results.push({ index: i, char, code: hexCode, name, reason, suggestion });
                pushed = true;
            }

            if (!pushed) {
                for (const r of GLOBAL_ISSUE_RANGES) {
                    if (cp >= r.start && cp <= r.end) {
                        reason = GLOBAL_ISSUE_REASON;
                        suggestion = null;
                        const rangeName = r.name || 'Arabic Presentation Forms';
                        const name = getUnicodeName(char, hexCode, rangeName);
                        results.push({ index: i, char, code: hexCode, name, reason, suggestion });
                        break;
                    }
                }
            }
        }

        return results;
    }

    function getUnicodeName(char, fallbackCode, rangeName) {
        if (Object.prototype.hasOwnProperty.call(UNICODE_NAMES, char)) {
            return UNICODE_NAMES[char];
        }

        return rangeName ? `${rangeName} (${fallbackCode})` : fallbackCode;
    }

    function renderAllCharCodes(text) {
        allCharCodesDisplay.innerHTML = '';
        if (!text) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            const span = document.createElement('span');
            span.className = 'code-pill';
            span.textContent = getDisplayChar(char) + ' (U+' + code + ')';
            span.addEventListener('mouseenter', () => highlightCharInVisual(i));
            span.addEventListener('mouseleave', () => unhighlightCharInVisual(i));
            fragment.appendChild(span);
        }
        allCharCodesDisplay.appendChild(fragment);
    }

    function renderResults(text, results) {
        resultsDisplay.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const resultsMap = new Map();

        results.forEach((item, listIndex) => {
            resultsMap.set(item.index, { ...item, listIndex });
        });

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.dataset.charIndex = i;
            span.textContent = char;
            if (resultsMap.has(i)) {
                const item = resultsMap.get(i);
                span.className = 'char-issue';
                span.dataset.listIndex = item.listIndex;
                span.addEventListener('mouseenter', () => highlightTable(item.listIndex));
                span.addEventListener('mouseleave', () => unhighlightTable(item.listIndex));
                span.addEventListener('click', () => highlightTable(item.listIndex));
            } else {
                span.className = 'char-normal';
            }
            fragment.appendChild(span);
        }
        resultsDisplay.appendChild(fragment);
    }

    function renderTable(results) {
        resultsTableBody.innerHTML = '';
        if (!results || results.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align:center;padding:2rem;color:#27ae60;font-weight:500;">✓ No issues found. All characters match the selected script.</td>';
            resultsTableBody.appendChild(row);
            return;
        }

        results.forEach((item, listIndex) => {
            const row = document.createElement('tr');
            row.id = 'result-row-' + listIndex;
            const isFixed = appliedFixes.has(listIndex);
            const suggButtonLabel = item.suggestion ? 'Fix (→ ' + item.suggestion + ' U+' + item.suggestion.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ')' : '';
            const reasonText = item.reason || '';
            const actionButtonHtml = item.suggestion ? '<button class="' + (isFixed ? 'fix-action-btn active' : 'fix-action-btn') + '" data-list-index="' + listIndex + '">' + (isFixed ? 'Fixed ✓' : suggButtonLabel) + '</button>' : '';

            row.innerHTML =
                '<td style="font-family:var(--font-arabic);font-size:1.3rem;text-align:center;font-weight:600;">' + item.char + '</td>' +
                '<td style="font-family:monospace;font-weight:600;color:var(--secondary-color);">' + item.code + '</td>' +
                '<td>' + item.name + '</td>' +
                '<td>' + reasonText + '</td>' +
                '<td style="text-align:center;">' + actionButtonHtml + '</td>';

            row.addEventListener('mouseenter', () => highlightVisualByListIndex(listIndex));
            row.addEventListener('mouseleave', () => unhighlightVisualByListIndex(listIndex));
            resultsTableBody.appendChild(row);

            const fixBtn = row.querySelector('.fix-action-btn');
            if (fixBtn) {
                fixBtn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.listIndex, 10);
                    if (appliedFixes.has(idx)) appliedFixes.delete(idx);
                    else appliedFixes.add(idx);
                    renderTable(currentResults);
                    updateCorrectedText();
                    updateFixAllButtonLabel();
                });
            }
        });
    }

    function updateCorrectedText() {
        if (!correctedTextOutput) return;
        const originalText = textInput.value;
        if (!originalText) {
            correctedTextOutput.value = '';
            return;
        }

        const sortedFixes = Array.from(appliedFixes)
            .map(idx => currentResults[idx])
            .filter(item => item && item.suggestion != null)
            .sort((a, b) => b.index - a.index);

        const chars = originalText.split('');
        sortedFixes.forEach(item => {
            chars[item.index] = item.suggestion;
        });
        correctedTextOutput.value = chars.join('');
    }

    function highlightCharInVisual(charIndex) {
        const span = resultsDisplay.querySelector('[data-char-index="' + charIndex + '"]');
        if (span) span.classList.add('char-hover-active');
    }

    function unhighlightCharInVisual(charIndex) {
        const span = resultsDisplay.querySelector('[data-char-index="' + charIndex + '"]');
        if (span) span.classList.remove('char-hover-active');
    }

    function highlightVisualByListIndex(listIndex) {
        const span = resultsDisplay.querySelector('[data-list-index="' + listIndex + '"]');
        if (span) span.classList.add('highlight-active');
    }

    function unhighlightVisualByListIndex(listIndex) {
        const span = resultsDisplay.querySelector('[data-list-index="' + listIndex + '"]');
        if (span) span.classList.remove('highlight-active');
    }

    function highlightTable(listIndex) {
        const row = document.getElementById('result-row-' + listIndex);
        if (row) row.classList.add('table-row-active');
    }

    function unhighlightTable(listIndex) {
        const row = document.getElementById('result-row-' + listIndex);
        if (row) row.classList.remove('table-row-active');
    }

    function getDisplayChar(char) {
        if (char === ' ') return 'Space';
        if (char === '\n') return 'LF';
        if (char === '\t') return 'Tab';
        return char;
    }
});