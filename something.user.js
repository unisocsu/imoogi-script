// ==UserScript==
// @name         Pro Emoji & Text Shortcuts Replacer
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  החלפת קיצורים לאימוג'ים, המרת מספרים למילים (כולל עשרוניים), תפריט סינון בזמן אמת ותמיכה מורחבת בעורכי טקסט
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const defaultEmojis = {
        "/מצחיק/": "😊", "/חיוך/": "😃", "/צוחק/": "😂", "/בוכה/": "😭",
        "/מאוהב/": "😍", "/משקפיים/": "😎", "/עצוב/": "😢", "/כועס/": "😡",
        "/לייק/": "👍", "/בוז/": "👎", "/תודה/": "🙏", "/כפיים/": "👏",
        "/לב/": "❤️", "/אש/": "🔥", "/כוכב/": "⭐", "/וי/": "✅", "/איקס/": "❌",
        "/תאריך/": "DYNAMIC_DATE", "/שעה/": "DYNAMIC_TIME"
    };

    function getEmojiMap() { return GM_getValue("emojiMap", defaultEmojis); }
    function setEmojiMap(map) { GM_setValue("emojiMap", map); }
    function isEnabled() { return GM_getValue("scriptEnabled", true); }
    function setEnabled(val) { GM_setValue("scriptEnabled", val); }

    function numberToWordsHebrew(num) {
        num = parseInt(num, 10);
        if (isNaN(num) || num < 0 || num > 999999) return null;
        if (num === 0) return "אפס";

        const units = ["", "אחד", "שניים", "שלושה", "ארבעה", "חמישה", "שישה", "שבעה", "שמונה", "תשעה"];
        const teens = ["עשר", "אחד עשר", "שניים עשר", "שלושה עשר", "ארבעה עשר", "חמישה עשר", "שישה עשר", "שבעה עשר", "שמונה עשר", "תשעה עשר"];
        const tens = ["", "", "עשרים", "שלושים", "ארבעים", "חמישים", "שישים", "שבעים", "שמונים", "תשעים"];
        const hundreds = ["", "מאה", "מאתיים", "שלוש מאות", "ארבע מאות", "חמש מאות", "שש מאות", "שבע מאות", "שמונה מאות", "תשע מאות"];

        function convertGroup(n) {
            let parts = [];
            let h = Math.floor(n / 100);
            let rem = n % 100;

            if (h > 0) parts.push(hundreds[h]);

            if (rem > 0) {
                if (rem < 10) {
                    parts.push(units[rem]);
                } else if (rem < 20) {
                    parts.push(teens[rem - 10]);
                } else {
                    let t = Math.floor(rem / 10);
                    let u = rem % 10;
                    if (u > 0) {
                        parts.push(tens[t] + " ו" + units[u]);
                    } else {
                        parts.push(tens[t]);
                    }
                }
            }

            if (parts.length > 1 && !parts[parts.length - 1].startsWith("ו")) {
                parts[parts.length - 1] = "ו" + parts[parts.length - 1];
            }
            return parts.join(" ");
        }

        let thousands = Math.floor(num / 1000);
        let remainder = num % 1000;
        let result = [];

        if (thousands > 0) {
            if (thousands === 1) result.push("אלף");
            else if (thousands === 2) result.push("אלפיים");
            else result.push(convertGroup(thousands) + " אלפים");
        }

        if (remainder > 0) {
            let remStr = convertGroup(remainder);
            if (thousands > 0 && !remStr.startsWith("ו")) {
                remStr = "ו" + remStr;
            }
            result.push(remStr);
        }

        return result.join(" ");
    }

    function numberToWordsHebrewWithDecimals(inputStr) {
        const parts = inputStr.split('.');
        const intWords = numberToWordsHebrew(parts[0]);
        if (!intWords) return null;
        if (parts.length === 1) return intWords;
        const decWords = numberToWordsHebrew(parts[1]);
        return decWords ? `${intWords} נקודה ${decWords}` : intWords;
    }

    function processValue(val) {
        const now = new Date();
        if (val === "DYNAMIC_DATE") return now.toLocaleDateString('he-IL');
        if (val === "DYNAMIC_TIME") return now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return val;
    }

    function isInputTarget(target) {
        return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.getAttribute('contenteditable') === 'true');
    }

    function getText(element) {
        return element.isContentEditable || element.getAttribute('contenteditable') === 'true' ? element.innerText : element.value;
    }

    function replaceInElement(element, search, replace) {
        if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
            element.focus();
            const text = element.innerText;
            if (text.includes(search)) {
                element.innerText = text.replace(search, replace);
                // הזזת הסמן לסוף הטקסט
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(element);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } else {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            const val = element.value;
            element.value = val.replace(search, replace);
            element.setSelectionRange(start, end);
        }
    }

    document.addEventListener('input', function(e) {
        if (!isEnabled()) return;
        const target = e.target;
        if (!isInputTarget(target)) return;

        let text = getText(target);
        if (!text) return;

        console.log('[EmojiScript] Input detected:', text);

        // בדיקת מספר עשרוני/שלם
        const numMatch = text.match(/\/(\d+(?:\.\d+)?)\//);
        if (numMatch) {
            const words = numberToWordsHebrewWithDecimals(numMatch[1]);
            if (words) {
                replaceInElement(target, numMatch[0], words);
                closeAutoComplete();
                return;
            }
        }

        // בדיקת תפריט בחירה
        if (text.includes('/בחירה/')) {
            console.log('[EmojiScript] Opening selection menu');
            replaceInElement(target, '/בחירה/', '');
            openSelectionMenu(target);
            return;
        }

        // בדיקת קיצורים רגילים
        const emojiMap = getEmojiMap();
        for (const [shortcut, emoji] of Object.entries(emojiMap)) {
            if (text.includes(shortcut)) {
                replaceInElement(target, shortcut, processValue(emoji));
                closeAutoComplete();
                return;
            }
        }

        handleAutoComplete(target, text);
    }, true);

    document.addEventListener('keydown', function(e) {
        if (!isEnabled()) return;
        if (e.key !== ' ' && e.key !== 'Enter') return;

        const target = e.target;
        if (!isInputTarget(target)) return;

        let text = getText(target);
        if (!text) return;

        const numMatch = text.match(/\/(\d+(?:\.\d+)?)$/);
        if (numMatch) {
            const words = numberToWordsHebrewWithDecimals(numMatch[1]);
            if (words) {
                e.preventDefault();
                replaceInElement(target, numMatch[0], words + (e.key === ' ' ? ' ' : ''));
                closeAutoComplete();
                return;
            }
        }

        const emojiMap = getEmojiMap();
        for (const [shortcut, emoji] of Object.entries(emojiMap)) {
            const cleanShortcut = shortcut.replace(/\/$/,'');
            if (text.endsWith(cleanShortcut)) {
                e.preventDefault();
                replaceInElement(target, cleanShortcut, processValue(emoji) + (e.key === ' ' ? ' ' : ''));
                closeAutoComplete();
                break;
            }
        }
    }, true);

    let autoMenu = null;

    function handleAutoComplete(target, text) {
        const lastSlash = text.lastIndexOf('/');
        if (lastSlash !== -1 && (lastSlash === text.length - 1 || !text.slice(lastSlash).includes(' '))) {
            const query = text.slice(lastSlash + 1).toLowerCase();
            
            if (/^\d+(\.\d*)?$/.test(query)) {
                const words = numberToWordsHebrewWithDecimals(query);
                if (words) {
                    showAutoComplete(target, [[`/${query}/`, words]], '/' + query);
                    return;
                }
            }

            if (query.length > 0) {
                const map = getEmojiMap();
                const matches = Object.entries(map).filter(([k]) => k.toLowerCase().includes(query) && k !== '/בחירה/');
                if (matches.length > 0) {
                    showAutoComplete(target, matches, '/' + query);
                    return;
                }
            }
        }
        closeAutoComplete();
    }

    function showAutoComplete(target, matches, rawQuery) {
        closeAutoComplete();
        autoMenu = document.createElement('div');
        autoMenu.id = 'emoji-autocomplete';
        autoMenu.style.cssText = `
            position: fixed;
            background: #ffffff;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            z-index: 2147483647;
            max-height: 180px;
            overflow-y: auto;
            direction: rtl;
            font-family: Arial, sans-serif;
            font-size: 13px;
            color: #333;
        `;

        const rect = target.getBoundingClientRect();
        autoMenu.style.top = (rect.bottom + 5) + 'px';
        autoMenu.style.left = rect.left + 'px';

        matches.slice(0, 8).forEach(([shortcut, emoji]) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; gap: 15px; border-bottom: 1px solid #eee; background: #fff;';
            item.innerHTML = `<span>${shortcut}</span> <b>${processValue(emoji)}</b>`;
            item.onmousedown = function(e) {
                e.preventDefault();
                replaceInElement(target, rawQuery, processValue(emoji));
                closeAutoComplete();
            };
            autoMenu.appendChild(item);
        });

        document.body.appendChild(autoMenu);
    }

    function closeAutoComplete() {
        if (autoMenu) {
            autoMenu.remove();
            autoMenu = null;
        }
    }

    function openSelectionMenu(activeInput) {
        const existingContainer = document.getElementById('emoji-select-container');
        if (existingContainer) existingContainer.remove();

        const container = document.createElement('div');
        container.id = 'emoji-select-container';
        container.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.3);
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
        `;

        const menu = document.createElement('div');
        menu.style.cssText = `
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            max-width: 320px;
            max-height: 300px;
            overflow-y: auto;
            direction: rtl;
        `;

        const emojiMap = getEmojiMap();
        Object.entries(emojiMap).forEach(([key, value]) => {
            if (key === '/בחירה/') return;
            const btn = document.createElement('button');
            const displayVal = processValue(value);
            btn.innerText = displayVal;
            btn.title = key;
            btn.style.cssText = 'font-size: 20px; padding: 6px; cursor: pointer; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;';
            btn.onclick = function() {
                replaceInElement(activeInput, '', displayVal);
                container.remove();
            };
            menu.appendChild(btn);
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'סגור';
        closeBtn.style.cssText = 'grid-column: span 6; padding: 6px; cursor: pointer; margin-top: 5px;';
        closeBtn.onclick = () => container.remove();
        menu.appendChild(closeBtn);

        container.appendChild(menu);
        container.onclick = (e) => { if (e.target === container) container.remove(); };
        document.body.appendChild(container);
    }

    function createSettingsButton() {
        const btn = document.createElement('div');
        btn.innerText = '⚙️';
        btn.title = 'הגדרות אימוג\'י';
        btn.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 32px;
            height: 32px;
            background: #ffffff;
            border: 1px solid #ccc;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2147483646;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-size: 16px;
            user-select: none;
        `;
        btn.onclick = openSettingsModal;
        document.body.appendChild(btn);
    }

    function openSettingsModal() {
        const existingOverlay = document.getElementById('emoji-settings-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'emoji-settings-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.3);
            z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #fff;
            border: 1px solid #888;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            width: 340px;
            direction: rtl;
            font-family: Arial, sans-serif;
            font-size: 13px;
            color: #333;
        `;

        modal.innerHTML = `
            <h3 style="margin-top:0;">הגדרות סקריפט אימוג'ים</h3>
            <label style="display:block; margin-bottom: 12px;">
                <input type="checkbox" id="toggle-script" ${isEnabled() ? 'checked' : ''}>
                הפעל סקריפט
            </label>
            <hr>
            <h4 style="margin: 8px 0;">הוספת קיצור חדש</h4>
            <div style="display:flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="new-shortcut" placeholder="/קיצור/" style="width: 45%; padding: 4px;">
                <input type="text" id="new-emoji" placeholder="😊" style="width: 35%; padding: 4px;">
                <button id="add-btn" style="width: 20%; cursor:pointer;">הוסף</button>
            </div>
            <hr>
            <h4 style="margin: 8px 0;">קיצורים קיימים</h4>
            <input type="text" id="search-shortcuts" placeholder="חפש ברשימה..." style="width: 100%; padding: 4px; margin-bottom: 6px; box-sizing: border-box;">
            <div id="shortcuts-list" style="max-height: 140px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #eee; padding: 5px;"></div>
            <button id="close-settings" style="width: 100%; padding: 8px; cursor: pointer;">סגור</button>
        `;

        overlay.appendChild(modal);
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);

        document.getElementById('toggle-script').onchange = (e) => setEnabled(e.target.checked);

        function renderList(filter = '') {
            const listDiv = document.getElementById('shortcuts-list');
            listDiv.innerHTML = '';
            const map = getEmojiMap();

            for (const [key, val] of Object.entries(map)) {
                if (filter && !key.toLowerCase().includes(filter.toLowerCase()) && !val.includes(filter)) continue;
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px dashed #ddd; padding-bottom: 2px;';
                row.innerHTML = `<span><b>${key}</b> ➔ ${val}</span><button style="color: red; cursor: pointer; border: none; background: none; font-weight: bold;">✖</button>`;
                row.querySelector('button').onclick = function() {
                    delete map[key];
                    setEmojiMap(map);
                    renderList(document.getElementById('search-shortcuts').value.trim());
                };
                listDiv.appendChild(row);
            }
        }

        renderList();
        document.getElementById('search-shortcuts').oninput = (e) => renderList(e.target.value.trim());
        document.getElementById('add-btn').onclick = function() {
            let shortcut = document.getElementById('new-shortcut').value.trim();
            const emoji = document.getElementById('new-emoji').value.trim();
            if (shortcut && emoji) {
                if (!shortcut.startsWith('/')) shortcut = '/' + shortcut;
                if (!shortcut.endsWith('/')) shortcut = shortcut + '/';
                const map = getEmojiMap();
                map[shortcut] = emoji;
                setEmojiMap(map);
                renderList();
                document.getElementById('new-shortcut').value = '';
                document.getElementById('new-emoji').value = '';
            }
        };
        document.getElementById('close-settings').onclick = () => overlay.remove();
    }

    createSettingsButton();
})();
