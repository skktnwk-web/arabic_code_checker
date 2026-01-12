const LANGUAGE_RULES = {
    "Persian": {
        "error": {
            "ي": { reason: "Arabic Yeh (U+064A) is normally replaced by Farsi Yeh (U+06CC)", suggestion: "ی" },
            "ك": { reason: "Arabic Kaf (U+0643) is normally replaced by Keheh (U+06A9)", suggestion: "ک" },
            "ى": { reason: "Arabic Alef Maqsura (U+0649) is not used in Persian", suggestion: "ی" },
        },
        "warning": {
            "ۀ": { reason: "Heh with Yeh above (U+06C0) is context-dependent" },
            "ة": { reason: "Teh Marbuta (U+0629) is rare in Persian and usually replaced by Heh", suggestion: "ه" },
            "ؤ": { reason: "Waw with Hamza above is usually Arabic-origin vocabulary" },
            "ئ": { reason: "Yeh with Hamza above is usually Arabic-origin vocabulary" },
        }
    },
    "Arabic": {
        "error": {
            "پ": { reason: "Peh (U+067E) is not used in Arabic", suggestion: "ب" },
            "چ": { reason: "Tcheh (U+0686) is not used in Arabic", suggestion: "ج" },
            "ژ": { reason: "Jeh (U+0698) is not used in Arabic", suggestion: "ز" },
            "گ": { reason: "Gaf (U+06AF) is not used in Arabic", suggestion: "ك" },
            "ی": { reason: "Farsi Yeh (U+06CC) should be Arabic Yeh (U+064A)", suggestion: "ي" },
            "ک": { reason: "Keheh (U+06A9) should be Arabic Kaf (U+0643)", suggestion: "ك" },
        },
        "warning": {
            "ڤ": { reason: "Veh (U+06A4) appears only in loanwords in Arabic" },
            "ـ": { reason: "Tatweel (Kashida) should not be used in normalized Arabic text" },
            "‌": { reason: "Zero-width non-joiner may affect searching and normalization" },
        }
    }
};

const CHAR_NAMES = {
    "ي": "ARABIC LETTER YEH",
    "ك": "ARABIC LETTER KAF",
    "ى": "ARABIC LETTER ALEF MAKSURA",
    "ۀ": "ARABIC LETTER HEH WITH YEH ABOVE",
    "ة": "ARABIC LETTER TEH MARBUTA",
    "ؤ": "ARABIC LETTER WAW WITH HAMZA ABOVE",
    "ئ": "ARABIC LETTER YEH WITH HAMZA ABOVE",
    "پ": "ARABIC LETTER PEH",
    "چ": "ARABIC LETTER TCHEH",
    "ژ": "ARABIC LETTER JEH",
    "گ": "ARABIC LETTER GAF",
    "ی": "ARABIC LETTER FARSI YEH",
    "ک": "ARABIC LETTER KEHEH",
    "ڤ": "ARABIC LETTER VEH",
    "ـ": "ARABIC TATWEEL",
    "‌": "ZERO WIDTH NON-JOINER"
};

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const textInput = document.getElementById('text-input');
    const resultsDisplay = document.getElementById('results-display');
    const allCharCodesDisplay = document.getElementById('all-char-codes-display');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const languageRadios = document.getElementsByName('language');

    let currentResults = [];

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performAnalysis);
    }

    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        resultsDisplay.innerHTML = '<span class="placeholder-text">Analysis highlights...</span>';
        allCharCodesDisplay.innerHTML = '<span class="placeholder-text">Character code breakdown...</span>';
        resultsTableBody.innerHTML = '';
        currentResults = [];
    });

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performAnalysis();
        }
    });

    textInput.addEventListener('input', () => {
        const text = textInput.value;
        if (!text) {
            resultsDisplay.innerHTML = '<span class="placeholder-text">Analysis highlights...</span>';
            allCharCodesDisplay.innerHTML = '<span class="placeholder-text">Character code breakdown...</span>';
            resultsTableBody.innerHTML = '';
            currentResults = [];
        }
    });

    function getSelectedLanguage() {
        for (const radio of languageRadios) {
            if (radio.checked) return radio.value;
        }
        return 'Persian';
    }

    function performAnalysis() {
        const text = textInput.value;
        if (!text) return;

        const lang = getSelectedLanguage();
        const rules = LANGUAGE_RULES[lang] || {};
        const errors = rules.error || {};
        const warnings = rules.warning || {};

        currentResults = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            let category = null;
            let info = null;

            if (errors[char]) {
                category = "ERROR";
                info = errors[char];
            } else if (warnings[char]) {
                category = "WARNING";
                info = warnings[char];
            }

            if (category) {
                const codePoint = char.codePointAt(0);
                const code = "U+" + codePoint.toString(16).toUpperCase().padStart(4, '0');
                const name = CHAR_NAMES[char] || "UNKNOWN";

                currentResults.push({
                    index: i,
                    char: char,
                    code: code,
                    name: name,
                    level: category,
                    reason: info.reason,
                    suggestion: info.suggestion
                });
            }
        }

        renderResults(text, currentResults);
        renderTable(currentResults);
        renderAllCharCodes(text);
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
            span.style.cursor = 'default';

            let displayChar = char;
            if (char === ' ') displayChar = 'Space';
            else if (char === '\n') displayChar = 'LF';
            else if (char === '\t') displayChar = 'Tab';

            span.textContent = `${displayChar} (U+${code})`;

            span.addEventListener('mouseenter', () => highlightCharInVisual(i));
            span.addEventListener('mouseleave', () => unhighlightCharInVisual(i));

            span.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const selection = window.getSelection();
                const range = document.createRange();
                const fullText = span.textContent;
                const startPos = fullText.indexOf('U+');
                const endPos = fullText.lastIndexOf(')');

                if (startPos !== -1 && endPos !== -1 && span.firstChild) {
                    range.setStart(span.firstChild, startPos);
                    range.setEnd(span.firstChild, endPos);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });

            fragment.appendChild(span);
        }

        allCharCodesDisplay.appendChild(fragment);
    }

    function renderResults(text, results) {
        resultsDisplay.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const resultsMap = new Map();

        if (results) {
            results.forEach((item, listIndex) => {
                resultsMap.set(item.index, { ...item, listIndex });
            });
        }

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.textContent = char;
            span.dataset.charIndex = i;

            if (resultsMap.has(i)) {
                const item = resultsMap.get(i);
                span.className = `char-${item.level.toLowerCase()}`;
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
            row.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 2rem; color: #27ae60; font-weight: 500;">
                    ✓ 問題は見つかりませんでした。すべての文字が適切です。
                </td>
            `;
            resultsTableBody.appendChild(row);
            return;
        }

        results.forEach((item, listIndex) => {
            const row = document.createElement('tr');
            row.id = `result-row-${listIndex}`;

            let suggestionCode = '';
            if (item.suggestion) {
                const codePoint = item.suggestion.codePointAt(0);
                suggestionCode = ' U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
            }

            row.innerHTML = `
                <td><span style="font-family: var(--font-arabic); font-size: 1.2rem;">${item.char}</span></td>
                <td><span style="font-family: monospace;">${item.code}</span></td>
                <td>${item.name}</td>
                <td><span class="tag tag-${item.level.toLowerCase()}">${item.level}</span></td>
                <td>${item.reason || ''}</td>
                <td>
                    ${item.suggestion ? `<button class="fix-btn" onclick="applyFix(${listIndex})">Fix (${item.suggestion}${suggestionCode})</button>` : ''}
                </td>
            `;

            row.addEventListener('mouseenter', () => highlightVisualByListIndex(listIndex));
            row.addEventListener('mouseleave', () => unhighlightVisualByListIndex(listIndex));
            resultsTableBody.appendChild(row);
        });
    }

    function highlightCharInVisual(charIndex) {
        const span = resultsDisplay.querySelector(`span[data-char-index="${charIndex}"]`);
        if (span) {
            span.classList.add('char-hover-active');
            span.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    function unhighlightCharInVisual(charIndex) {
        const span = resultsDisplay.querySelector(`span[data-char-index="${charIndex}"]`);
        if (span) span.classList.remove('char-hover-active');
    }

    function highlightVisualByListIndex(listIndex) {
        const span = resultsDisplay.querySelector(`span[data-list-index="${listIndex}"]`);
        if (span) span.classList.add('highlight-active');
    }

    function unhighlightVisualByListIndex(listIndex) {
        const span = resultsDisplay.querySelector(`span[data-list-index="${listIndex}"]`);
        if (span) span.classList.remove('highlight-active');
    }

    function highlightTable(listIndex) {
        const row = document.getElementById(`result-row-${listIndex}`);
        if (row) {
            row.classList.add('table-row-active');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function unhighlightTable(listIndex) {
        const row = document.getElementById(`result-row-${listIndex}`);
        if (row) row.classList.remove('table-row-active');
    }

    window.applyFix = function (listIndex) {
        const item = currentResults[listIndex];
        if (!item || !item.suggestion) return;

        const currentText = textInput.value;
        // Adjust index because previous fixes might have shifted text?
        // Actually, our logic assumes simple replacement.
        // If we do single fix, we re-analyze immediately, so indices are fresh.
        const index = item.index;

        const newText = currentText.substring(0, index) + item.suggestion + currentText.substring(index + 1);
        textInput.value = newText;
        performAnalysis();
    };
});
