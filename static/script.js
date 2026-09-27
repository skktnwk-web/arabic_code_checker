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

    // Detection rules are data-driven, sourced from the language review spreadsheet.
    // Each entry describes one character that should be flagged for a given language,
    // including an optional `condition` for context-dependent detection
    // ('word-final' = only at the end of a word, 'not-word-final' = only NOT at the end of a word).
    const LANGUAGE_RULES_DATA = [
        { language: "Arabic", char: "ک", code: "U+06A9", category: "Error", reason: "Arabic Keheh (U+06A9) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ڪ", code: "U+06AA", category: "Error", reason: "Arabic Letter Swash Kaf (U+06AA) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ڬ", code: "U+06AC", category: "Error", reason: "Arabic Letter Kaf with Dot Above (U+06AC) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ڭ", code: "U+06AD", category: "Error", reason: "Arabic Letter Ng (U+06AD) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "گ", code: "U+06AF", category: "Error", reason: "Arabic Letter Gaf (U+06AF) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ݢ", code: "U+0762", category: "Error", reason: "Arabic Letter Keheh with Dot Above (U+0762) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ݣ", code: "U+0763", category: "Error", reason: "Arabic Letter Keheh with Three Dots Above (U+0763) is normally not used. It could be Arabic Kaf (U+0643)", replacement: "ك", condition: null },
        { language: "Arabic", char: "ي", code: "U+064A", category: "Caution", reason: "Be careful not to confuse Arabic Yeh (U+064A) with Arabic Alef Maksura (U+0649). If the letter is Alef Maksura, use Arabic Alef Maksura (U+0649)", replacement: "ى", condition: "word-final" },
        { language: "Arabic", char: "ى", code: "U+0649", category: "Caution", reason: "Arabic Alef Maksura (U+0649)  is normally used at the end of a word. Use Arabic Yeh (U+064A) if the letter is not Alef Maksura", replacement: "ي", condition: "not-word-final" },
        { language: "Arabic", char: "ی", code: "U+06CC", category: "Caution", reason: "Arabic Farsi Yeh (U+06CC) may be used in final position only in Qurʾānic texts (or shorter quotations). It could be Arabic Yeh (U+064A)", replacement: "ي", condition: null },
        { language: "Arabic", char: "ێ", code: "U+06CE", category: "Error", reason: "Arabic Letter Yeh with Small V (U+06CE) is normally not used. It could be Arabic Yeh (U+064A)", replacement: "ي", condition: null },
        { language: "Arabic", char: "ھ", code: "U+06BE", category: "Error", reason: "Arabic Letter Heh Doachashmee (U+06BE) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Arabic", char: "ہ", code: "U+06C1", category: "Error", reason: "Arabic Letter Heh Goal (U+06C1) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Arabic", char: "ە", code: "U+06D5", category: "Error", reason: "Arabic Letter Ae (U+06D5) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Arabic", char: "ۀ", code: "U+06C0", category: "Error", reason: "Arabic Letter Heh with Yeh Above (U+06C0) is normally not used", replacement: null, condition: null },
        { language: "Arabic", char: "ۿ", code: "U+06FF", category: "Error", reason: "Arabic Letter Heh with Inverted V (U+06FF) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Arabic", char: "پ", code: "U+067E", category: "Error", reason: "Arabic Letter Peh (U+067E) is normally not used. It could be Arabic Letter Beh (U+0628)", replacement: "ب", condition: null },
        { language: "Arabic", char: "چ", code: "U+0686", category: "Error", reason: "Arabic Letter Tcheh (U+0686) is normally not used.", replacement: null, condition: null },
        { language: "Arabic", char: "ژ", code: "U+0698", category: "Error", reason: "Arabic Letter Jeh (U+0698) is normally not used.", replacement: null, condition: null },
        { language: "Arabic", char: "ڤ", code: "U+06A4", category: "Error", reason: "Arabic Letter Veh (U+06A4) is normally not used.", replacement: null, condition: null },
        { language: "Arabic", char: "ں", code: "U+06BA", category: "Error", reason: "Arabic Letter Noon Ghunna (U+06BA) is normally not used. It could be Arabic Letter Noon (U+0646)", replacement: "ن", condition: null },
        { language: "Arabic", char: "ڑ", code: "U+0691", category: "Error", reason: "Arabic Letter Rreh (U+0691) is normally not used. It could be Arabic Letter Reh (U+0631)", replacement: "ر", condition: null },
        { language: "Arabic", char: "ڈ", code: "U+0688", category: "Error", reason: "Arabic Letter Ddal (U+0688) is normally not used. It could be Arabic Letter Dal (U+062F)", replacement: "د", condition: null },
        { language: "Arabic", char: "ٹ", code: "U+0679", category: "Error", reason: "Arabic Letter Tteh (U+0679) is normally not used. It could be Arabic Letter Teh (U+062A)", replacement: "ت", condition: null },
        { language: "Persian", char: "ك", code: "U+0643", category: "Error", reason: "Arabic Kaf (U+0643) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ڪ", code: "U+06AA", category: "Error", reason: "Arabic Letter Swash Kaf (U+06AA) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ڬ", code: "U+06AC", category: "Error", reason: "Arabic Letter Kaf with Dot Above (U+06AC) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ڭ", code: "U+06AD", category: "Error", reason: "Arabic Letter Ng (U+06AD) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ݢ", code: "U+0762", category: "Error", reason: "Arabic Letter Keheh with Dot Above (U+0762) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ݣ", code: "U+0763", category: "Error", reason: "Arabic Letter Keheh with Three Dots Above (U+0763) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Persian", char: "ي", code: "U+064A", category: "Error", reason: "Arabic Yeh (U+064A) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Persian", char: "ى", code: "U+0649", category: "Error", reason: "Arabic Alef Maksura (U+0649) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Persian", char: "ێ", code: "U+06CE", category: "Error", reason: "Arabic Letter Yeh with Small V (U+06CE) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Persian", char: "ھ", code: "U+06BE", category: "Error", reason: "Arabic Letter Heh Doachashmee (U+06BE) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Persian", char: "ہ", code: "U+06C1", category: "Error", reason: "Arabic Letter Heh Goal (U+06C1) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Persian", char: "ە", code: "U+06D5", category: "Error", reason: "Arabic Letter Ae (U+06D5) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Persian", char: "ۀ", code: "U+06C0", category: "Error", reason: "Arabic Letter Heh with Yeh Above (U+06C0) is normally not used. For ezāfe, use the sequence Arabic Letter Heh (U+0647) and Arabic Hamza Above (U+0654). (with Zero Width Non-Joiner (U+200C) if necessary to prevent linking to a following letter)", replacement: "هٔ", condition: null },
        { language: "Persian", char: "ۿ", code: "U+06FF", category: "Error", reason: "Arabic Letter Heh with Inverted V (U+06FF) is normally not used. It could be Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Persian", char: "ة", code: "U+0629", category: "Caution", reason: "Arabic Letter Teh Marbuta (U+0629) is normally not used.", replacement: null, condition: null },
        { language: "Persian", char: "ڤ", code: "U+06A4", category: "Error", reason: "Arabic Letter Veh (U+06A4) is normally not used.", replacement: null, condition: null },
        { language: "Persian", char: "ں", code: "U+06BA", category: "Error", reason: "Arabic Letter Noon Ghunna (U+06BA) is normally not used. It could be Arabic Letter Noon (U+0646)", replacement: "ن", condition: null },
        { language: "Persian", char: "ڑ", code: "U+0691", category: "Error", reason: "Arabic Letter Rreh (U+0691) is normally not used. It could be Arabic Letter Reh (U+0631)", replacement: "ر", condition: null },
        { language: "Persian", char: "ڈ", code: "U+0688", category: "Error", reason: "Arabic Letter Ddal (U+0688) is normally not used. It could be Arabic Letter Dal (U+062F)", replacement: "د", condition: null },
        { language: "Persian", char: "ٹ", code: "U+0679", category: "Error", reason: "Arabic Letter Tteh (U+0679) is normally not used. It could be Arabic Letter Teh (U+062A)", replacement: "ت", condition: null },
        { language: "Urdu", char: "ك", code: "U+0643", category: "Error", reason: "Arabic Kaf (U+0643) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ڪ", code: "U+06AA", category: "Error", reason: "Arabic Letter Swash Kaf (U+06AA) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ڬ", code: "U+06AC", category: "Error", reason: "Arabic Letter Kaf with Dot Above (U+06AC) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ڭ", code: "U+06AD", category: "Error", reason: "Arabic Letter Ng (U+06AD) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ݢ", code: "U+0762", category: "Error", reason: "Arabic Letter Keheh with Dot Above is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ݣ", code: "U+0763", category: "Error", reason: "Arabic Letter Keheh with Three Dots Above (U+0763) is normally not used. It could be Arabic Keheh (U+06A9)", replacement: "ک", condition: null },
        { language: "Urdu", char: "ي", code: "U+064A", category: "Error", reason: "Arabic Yeh (U+064A) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Urdu", char: "ى", code: "U+0649", category: "Error", reason: "Arabic Alef Maksura (U+0649) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Urdu", char: "ێ", code: "U+06CE", category: "Error", reason: "Arabic Letter Yeh with Small V (U+06CE) is normally not used. It could be Arabic Farsi Yeh (U+06CC)", replacement: "ی", condition: null },
        { language: "Urdu", char: "ھ", code: "U+06BE", category: "Caution", reason: "Be careful not to confuse Arabic Letter Heh Doachashmee (U+06BE) with Arabic Letter Heh (U+0647)", replacement: "ه", condition: null },
        { language: "Urdu", char: "ه", code: "U+0647", category: "Caution", reason: "Be careful not to confuse Arabic Letter Heh (U+0647) with Arabic Letter Heh Doachashmee (U+06BE)", replacement: "ھ", condition: null },
        { language: "Urdu", char: "ە", code: "U+06D5", category: "Error", reason: "Arabic Letter Ae (U+06D5) is normally not used", replacement: null, condition: null },
        { language: "Urdu", char: "ۀ", code: "U+06C0", category: "Error", reason: "Arabic Letter Heh with Yeh Above (U+06C0) is normally not used", replacement: null, condition: null },
        { language: "Urdu", char: "ۿ", code: "U+06FF", category: "Error", reason: "Arabic Letter Heh with Inverted V (U+06FF) is normally not used", replacement: null, condition: null },
        { language: "Urdu", char: "ة", code: "U+0629", category: "Caution", reason: "Arabic Letter Teh Marbuta (U+0629) is normally not used.", replacement: null, condition: null },
        { language: "Urdu", char: "ڤ", code: "U+06A4", category: "Error", reason: "Arabic Letter Veh (U+06A4) is normally not used.", replacement: null, condition: null },
    ];

    // Build a fast lookup: LANGUAGE_RULES[language][char] -> rule
    function buildLanguageRules(data) {
        const rules = {};
        data.forEach(entry => {
            if (!rules[entry.language]) rules[entry.language] = {};
            rules[entry.language][entry.char] = entry;
        });
        return rules;
    }
    const LANGUAGE_RULES = buildLanguageRules(LANGUAGE_RULES_DATA);

    const GLOBAL_ISSUE_RANGES = [
        { start: 0xFB50, end: 0xFDFF, name: 'Arabic Presentation Forms-A' },
        { start: 0xFE70, end: 0xFEFF, name: 'Arabic Presentation Forms-B' }
    ];

    const GLOBAL_ISSUE_REASON = 'The use of characters in the Arabic Presentation Forms block should be avoided.';

    const UNICODE_NAMES = {
        "ک": "Arabic Keheh" + ' (U+06A9)',
        "ڪ": "Arabic Letter Swash Kaf" + ' (U+06AA)',
        "ڬ": "Arabic Letter Kaf with Dot Above" + ' (U+06AC)',
        "ڭ": "Arabic Letter Ng" + ' (U+06AD)',
        "گ": "Arabic Letter Gaf" + ' (U+06AF)',
        "ݢ": "Arabic Letter Keheh with Dot Above" + ' (U+0762)',
        "ݣ": "Arabic Letter Keheh with Three Dots Above" + ' (U+0763)',
        "ي": "Arabic Yeh" + ' (U+064A)',
        "ى": "Arabic Alef Maksura" + ' (U+0649)',
        "ی": "Arabic Farsi Yeh" + ' (U+06CC)',
        "ێ": "Arabic Letter Yeh with Small V" + ' (U+06CE)',
        "ھ": "Arabic Letter Heh Doachashmee" + ' (U+06BE)',
        "ہ": "Arabic Letter Heh Goal" + ' (U+06C1)',
        "ە": "Arabic Letter Ae" + ' (U+06D5)',
        "ۀ": "Arabic Letter Heh with Yeh Above" + ' (U+06C0)',
        "ۿ": "Arabic Letter Heh with Inverted V" + ' (U+06FF)',
        "پ": "Arabic Letter Peh" + ' (U+067E)',
        "چ": "Arabic Letter Tcheh" + ' (U+0686)',
        "ژ": "Arabic Letter Jeh" + ' (U+0698)',
        "ڤ": "Arabic Letter Veh" + ' (U+06A4)',
        "ں": "Arabic Letter Noon Ghunna" + ' (U+06BA)',
        "ڑ": "Arabic Letter Rreh" + ' (U+0691)',
        "ڈ": "Arabic Letter Ddal" + ' (U+0688)',
        "ٹ": "Arabic Letter Tteh" + ' (U+0679)',
        "ك": "Arabic Kaf" + ' (U+0643)',
        "ة": "Arabic Letter Teh Marbuta" + ' (U+0629)',
        "ه": "Arabic Letter Heh" + ' (U+0647)',
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
        const results = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const cp = char.codePointAt(0);
            const hexCode = 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
            let pushed = false;

            // Look up this character in the language's rule table (built from the review spreadsheet).
            const rule = rules[char];
            if (rule) {
                let conditionMet = true;
                if (rule.condition === 'word-final') {
                    // Only flag when the character sits at the end of a word.
                    conditionMet = isWordBoundaryAt(text, i + 1);
                } else if (rule.condition === 'not-word-final') {
                    // Only flag when the character does NOT sit at the end of a word.
                    conditionMet = !isWordBoundaryAt(text, i + 1);
                }

                if (conditionMet) {
                    const name = getUnicodeName(char, hexCode);
                    results.push({
                        index: i,
                        char,
                        code: hexCode,
                        name,
                        reason: rule.reason,
                        suggestion: rule.replacement || null,
                        category: rule.category || 'Error'
                    });
                    pushed = true;
                }
            }

            if (!pushed) {
                for (const r of GLOBAL_ISSUE_RANGES) {
                    if (cp >= r.start && cp <= r.end) {
                        const rangeName = r.name || 'Arabic Presentation Forms';
                        const name = getUnicodeName(char, hexCode, rangeName);
                        results.push({
                            index: i,
                            char,
                            code: hexCode,
                            name,
                            reason: GLOBAL_ISSUE_REASON,
                            suggestion: null,
                            category: 'Error'
                        });
                        break;
                    }
                }
            }
        }

        return results;
    }

    function isWordBoundaryAt(text, index) {
        if (index >= text.length) return true;
        const next = text[index];
        return !/[\p{L}\p{N}\p{M}]/u.test(next);
    }

    function getUnicodeName(char, fallbackCode, rangeName) {
        if (Object.prototype.hasOwnProperty.call(UNICODE_NAMES, char)) {
            return UNICODE_NAMES[char];
        }

        return rangeName ? rangeName : 'Unknown';
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
            row.innerHTML = '<td colspan="6" style="text-align:center;padding:2rem;color:#27ae60;font-weight:500;">✓ No issues found. All characters match the selected script.</td>';
            resultsTableBody.appendChild(row);
            return;
        }

        results.forEach((item, listIndex) => {
            const row = document.createElement('tr');
            row.id = 'result-row-' + listIndex;
            const isFixed = appliedFixes.has(listIndex);
            const category = item.category || 'Error';
            const suggButtonLabel = item.suggestion ? 'Fix (→ ' + item.suggestion + ' U+' + item.suggestion.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ')' : '';
            const reasonText = item.reason || '';
            const actionButtonHtml = item.suggestion ? '<button class="' + (isFixed ? 'fix-action-btn active' : 'fix-action-btn') + '" data-list-index="' + listIndex + '">' + (isFixed ? 'Fixed ✓' : suggButtonLabel) + '</button>' : '';

            row.innerHTML =
                '<td style="font-family:var(--font-arabic);font-size:1.3rem;text-align:center;font-weight:600;">' + item.char + '</td>' +
                '<td style="font-family:monospace;font-weight:600;color:var(--secondary-color);">' + item.code + '</td>' +
                '<td>' + item.name + '</td>' +
                '<td><span class="category-badge category-' + category.toLowerCase() + '">' + category + '</span></td>' +
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