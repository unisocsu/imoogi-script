// ==UserScript==
// @name         Pro Emoji & Text Shortcuts Replacer
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  החלפת קיצורים לאימוג'ים, המרת מספרים למילים, תפריט סינון בזמן אמת, טקסטים דינמיים וחיפוש בהגדרות
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // רשימת אימוג'ים מורחבת כברירת מחדל
    const defaultEmojis = {
        // רגשות וחיוכים
        "/מצחיק/": "😊", "/חיוך/": "😃", "/צוחק/": "😂", "/בוכה/": "😭",
        "/מאוהב/": "😍", "/משקפיים/": "😎", "/עצוב/": "😢", "/כועס/": "😡",
        "/מלאך/": "😇", "/חורץ_לשון/": "😜", "/מופתע/": "😮", "/חורף/": "🥶",
        "/חם/": "🥵", "/חולה/": "🤒", "/חכם/": "🤓", "/מחשב/": "🧐",
        "/smile/": "😊", "/laugh/": "😂", "/love/": "😍", "/cool/": "😎",

        // מחוות ואיברי גוף
        "/לייק/": "👍", "/בוז/": "👎", "/תודה/": "🙏", "/כפיים/": "👏",
        "/אגרוף/": "👊", "/שלום/": "👋", "/הצבעה/": "👈", "/שריר/": "💪",
        "/like/": "👍", "/dislike/": "👎",

        // סמלים ולבבות
        "/לב/": "❤️", "/לב_צהוב/": "💛", "/לב_ירוק/": "💚", "/אש/": "🔥",
        "/כוכב/": "⭐", "/100/": "💯", "/וי/": "✅", "/איקס/": "❌",
        "/אזהרה/": "⚠️", "/שאלה/": "❓", "/קריאה/": "❗", "/פלאג/": "🔌",
        "/heart/": "❤️", "/fire/": "🔥", "/star/": "⭐",

        // חיות וטבע
        "/כלב/": "🐶", "/חתול/": "🐱", "/אריה/": "🦁", "/קוף/": "🐒",
        "/פרפר/": "🦋", "/פרח/": "🌸", "/עץ/": "🌳", "/שמש/": "☀️",

        // אוכל ושתייה
        "/פיצה/": "🍕", "/המבורגר/": "🍔", "/קפה/": "☕", "/עוגה/": "🎂",
        "/גלידה/": "🍦", "/בירה/": "🍺",

        // קיצורים דינמיים
        "/תאריך/": "DYNAMIC_DATE",
        "/שעה/": "DYNAMIC_TIME"
    };

    function getEmojiMap() {
        return GM_getValue("emojiMap", defaultEmojis);
    }

    function setEmojiMap(map) {
        GM_setValue("emojiMap", map);
    }

    function isEnabled() {
        return GM_getValue("scriptEnabled", true);
    }

    function setEnabled(val) {
        GM_setValue("scriptEnabled", val);
    }

    // -------------------------------------------------------------
    // המרת מספרים למילים בעברית (עד 999,999)
    // -------------------------------------------------------------
    function numberToWordsHebrew(num) {
        if (num === 0) return "אפס";
        if (isNaN(num) || num < 0 || num > 999999) return null;

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

    // חישוב ערכים דינמיים
    function processValue(val) {
        const now = new Date();
        if (val === "DYNAMIC_DATE") return now.toLocaleDateString('he-IL');
        if (val === "DYNAMIC_TIME") return now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return val;
    }

    // -------------------------------------------------------------
    // 1. זיהוי והחלפת טקסט
    // -------------------------------------------------------------
    document.addEventListener('input', function(e) {
        if (!isEnabled()) return;
        const target = e.target;
        if (!isInputTarget(target)) return;

        let text = getText(target);

        // 1. בדיקת תבנית של מספר מוקף בסלאשים (למשל: /1499/)
        const numMatch = text.match(/\/(\d+)\//);
        if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            const words = numberToWordsHebrew(num);
            if (words) {
                replaceInElement(target, numMatch[0], words);
                return;
            }
        }

        // 2. בדיקה עבור תפריט בחירה מלא
        if (text.includes('/בחירה/')) {
            replaceInElement(target, '/בחירה/', '');
            openSelectionMenu(target);
            return;
        }

        // 3. בדיקת החלפות רגילות
        const emojiMap = getEmojiMap();
        for (const [shortcut, emoji] of Object.entries(emojiMap)) {
            if (text.includes(shortcut)) {
                replaceInElement(target, shortcut, processValue(emoji));
            }
        }

        // תפריט סינון בזמן אמת (AutoComplete)
        handleAutoComplete(target, text);
    }, true);

    // זיהוי לחיצה על רווח (Space) להשלמה של קיצור ללא סלאש סוגר
    document.addEventListener('keydown', function(e) {
        if (!isEnabled()) return;
        if (e.key !== ' ' && e.key !== 'Enter') return;

        const target = e.target;
        if (!isInputTarget(target)) return;

        let text = getText(target);

        // בדיקת מספר ללא סלאש בסוף (למשל /1499 ואז רווח)
        const numMatch = text.match(/\/(\d+)$/);
        if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            const words = numberToWordsHebrew(num);
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

    function isInputTarget(target) {
        return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    }

    function getText(element) {
        return element.isContentEditable ? element.innerText : element.value;
    }

    function replaceInElement(element, search, replace) {
        if (element.isContentEditable) {
            element.innerText = element.innerText.replace(search, replace);
        } else {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            const val = element.value;
            element.value = val.replace(search, replace);
            element.setSelectionRange(start, end);
        }
    }

    // -------------------------------------------------------------
    // 2. תפריט סינון רציף בזמן אמת (Auto-complete Popup)
    // -------------------------------------------------------------
    let autoMenu = null;

    function handleAutoComplete(target, text) {
        const lastSlash = text.lastIndexOf('/');
        if (lastSlash !== -1 && (lastSlash === text.length - 1 || !text.slice(lastSlash).includes(' '))) {
            const query = text.slice(lastSlash + 1).toLowerCase();
            
            // אם מקלידים מספר - מציגים תצוגה מקדימה של המילים
            if (/^\d+$/.test(query)) {
                const num = parseInt(query, 10);
                const words = numberToWordsHebrew(num);
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
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            z-index: 999999;
            max-height: 180px;
            overflow-y: auto;
            direction: rtl;
            font-family: Arial, sans-serif;
            font-size: 13px;
        `;

        const rect = target.getBoundingClientRect();
        autoMenu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        autoMenu.style.left = (rect.left + window.scrollX) + 'px';

        matches.slice(0, 8).forEach(([shortcut, emoji]) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; gap: 15px; border-bottom: 1px solid #eee;';
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

    // -------------------------------------------------------------
    // 3. תפריט בחירה צף (/בחירה/)
    // -------------------------------------------------------------
    function openSelectionMenu(activeInput) {
        const existingContainer = document.getElementById('emoji-select-container');
        if (existingContainer) existingContainer.remove();

        const container = document.createElement('div');
        container.id = 'emoji-select-container';
        container.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.2);
            z-index: 999998;
            display: flex; align-items: center; justify-content: center;
        `;

        const menu = document.createElement('div');
        menu.id = 'emoji-select-menu';
        menu.style.cssText = `
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 999999;
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
            btn.style.cssText = `
                font-size: 20px;
                padding: 6px;
                cursor: pointer;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
            `;
            btn.onclick = function() {
                insertAtCaret(activeInput, displayVal);
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

        container.onclick = function(e) {
            if (e.target === container) {
                container.remove();
            }
        };

        document.body.appendChild(container);
    }

    function insertAtCaret(element, text) {
        if (element.isContentEditable) {
            element.focus();
            document.execCommand('insertText', false, text);
        } else {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            element.value = element.value.substring(0, start) + text + element.value.substring(end);
            element.selectionStart = element.selectionEnd = start + text.length;
            element.focus();
        }
    }

    // -------------------------------------------------------------
    // 4. כפתור הגדרות וממשק ניהול
    // -------------------------------------------------------------
    function createSettingsButton() {
        const btn = document.createElement('div');
        btn.innerText = '⚙️';
        btn.title = 'הגדרות אימוג\'י';
        btn.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 30px;
            height: 30px;
            background: #ffffff;
            border: 1px solid #ccc;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 999998;
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
            z-index: 999998;
            display: flex; align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.id = 'emoji-settings-modal';
        modal.style.cssText = `
            background: #fff;
            border: 1px solid #888;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            z-index: 999999;
            width: 340px;
            direction: rtl;
            font-family: Arial, sans-serif;
            font-size: 13px;
        `;

        modal.innerHTML = `
            <h3 style="margin-top:0;">הגדרות סקריפט אימוג'ים</h3>
            <label style="display:block; margin-bottom: 12px;">
                <input type="checkbox" id="toggle-script" ${isEnabled() ? 'checked' : ''}>
                הפעל סקריפט (כבה להשבתה)
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
            <div style="display:flex; gap: 5px; margin-bottom: 10px;">
                <button id="export-btn" style="width: 50%; padding: 5px; cursor:pointer;">ייצא גיבוי (JSON)</button>
                <button id="import-btn" style="width: 50%; padding: 5px; cursor:pointer;">ייבא גיבוי</button>
                <input type="file" id="import-file" style="display:none;" accept=".json">
            </div>
            <button id="close-settings" style="width: 100%; padding: 8px; cursor: pointer;">סגור</button>
        `;

        overlay.appendChild(modal);

        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        document.body.appendChild(overlay);

        document.getElementById('toggle-script').onchange = (e) => setEnabled(e.target.checked);

        function renderList(filter = '') {
            const listDiv = document.getElementById('shortcuts-list');
            listDiv.innerHTML = '';
            const map = getEmojiMap();

            for (const [key, val] of Object.entries(map)) {
                if (filter && !key.toLowerCase().includes(filter.toLowerCase()) && !val.includes(filter)) {
                    continue;
                }
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px dashed #ddd; padding-bottom: 2px;';
                row.innerHTML = `
                    <span><b>${key}</b> ➔ ${val}</span>
                    <button style="color: red; cursor: pointer; border: none; background: none; font-weight: bold;">✖</button>
                `;
                row.querySelector('button').onclick = function() {
                    delete map[key];
                    setEmojiMap(map);
                    renderList(document.getElementById('search-shortcuts').value.trim());
                };
                listDiv.appendChild(row);
            }
        }

        renderList();

        document.getElementById('search-shortcuts').oninput = function(e) {
            renderList(e.target.value.trim());
        };

        document.getElementById('add-btn').onclick = function() {
            let shortcut = document.getElementById('new-shortcut').value.trim();
            const emoji = document.getElementById('new-emoji').value.trim();

            if (shortcut && emoji) {
                if (!shortcut.startsWith('/')) shortcut = '/' + shortcut;
                if (!shortcut.endsWith('/')) shortcut = shortcut + '/';

                const map = getEmojiMap();
                map[shortcut] = emoji;
                setEmojiMap(map);
                renderList(document.getElementById('search-shortcuts').value.trim());
                document.getElementById('new-shortcut').value = '';
                document.getElementById('new-emoji').value = '';
            }
        };

        document.getElementById('export-btn').onclick = function() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getEmojiMap(), null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "emoji_shortcuts_backup.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
        document.getElementById('import-file').onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const importedMap = JSON.parse(evt.target.result);
                    setEmojiMap(importedMap);
                    renderList();
                    alert('הגיבוי יובא בהצלחה!');
                } catch (err) {
                    alert('שגיאה בקריאת הקובץ.');
                }
            };
            reader.readAsText(file);
        };

        document.getElementById('close-settings').onclick = () => overlay.remove();
    }

    createSettingsButton();
})();
