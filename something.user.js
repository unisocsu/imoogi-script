// ==UserScript==
// @name         Pro Emoji & Text Shortcuts Replacer
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  החלפת קיצורים לאימוג'ים, תפריט סינון בזמן אמת, טקסטים דינמיים וייצוא/ייבוא הגדרות
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

    // חישוב ערכים דינמיים
    function processValue(val) {
        const now = new Date();
        if (val === "DYNAMIC_DATE") return now.toLocaleDateString('he-IL');
        if (val === "DYNAMIC_TIME") return now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return val;
    }

    // -------------------------------------------------------------
    // 1. החלפה בלחיצה על רווח / הקלדה
    // -------------------------------------------------------------
    document.addEventListener('input', function(e) {
        if (!isEnabled()) return;
        const target = e.target;
        if (!isInputTarget(target)) return;

        let text = getText(target);
        const emojiMap = getEmojiMap();

        // בדיקה עבור תפריט בחירה מלא
        if (text.includes('/בחירה/')) {
            replaceInElement(target, '/בחירה/', '');
            openSelectionMenu(target);
            return;
        }

        // בדיקת החלפות רגילות
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
        const emojiMap = getEmojiMap();

        for (const [shortcut, emoji] of Object.entries(emojiMap)) {
            const cleanShortcut = shortcut.replace(/\/$/,''); // בדיקה גם ללא סלאש בסוף
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
        if (lastSlash !== -1 && lastSlash === text.length - 1 || (lastSlash !== -1 && !text.slice(lastSlash).includes(' '))) {
            const query = text.slice(lastSlash + 1).toLowerCase();
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
        const existing = document.getElementById('emoji-select-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'emoji-select-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
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
                menu.remove();
            };
            menu.appendChild(btn);
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'סגור';
        closeBtn.style.cssText = 'grid-column: span 6; padding: 6px; cursor: pointer; margin-top: 5px;';
        closeBtn.onclick = () => menu.remove();
        menu.appendChild(closeBtn);

        document.body.appendChild(menu);
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
        const existing = document.getElementById('emoji-settings-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'emoji-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
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
            <div id="shortcuts-list" style="max-height: 140px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #eee; padding: 5px;"></div>
            <div style="display:flex; gap: 5px; margin-bottom: 10px;">
                <button id="export-btn" style="width: 50%; padding: 5px; cursor:pointer;">ייצא גיבוי (JSON)</button>
                <button id="import-btn" style="width: 50%; padding: 5px; cursor:pointer;">ייבא גיבוי</button>
                <input type="file" id="import-file" style="display:none;" accept=".json">
            </div>
            <button id="close-settings" style="width: 100%; padding: 8px; cursor: pointer;">סגור</button>
        `;

        document.body.appendChild(modal);

        document.getElementById('toggle-script').onchange = (e) => setEnabled(e.target.checked);

        function renderList() {
            const listDiv = document.getElementById('shortcuts-list');
            listDiv.innerHTML = '';
            const map = getEmojiMap();

            for (const [key, val] of Object.entries(map)) {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px dashed #ddd; padding-bottom: 2px;';
                row.innerHTML = `
                    <span><b>${key}</b> ➔ ${val}</span>
                    <button style="color: red; cursor: pointer; border: none; background: none; font-weight: bold;">✖</button>
                `;
                row.querySelector('button').onclick = function() {
                    delete map[key];
                    setEmojiMap(map);
                    renderList();
                };
                listDiv.appendChild(row);
            }
        }

        renderList();

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

        // ייצוא בלחיצה
        document.getElementById('export-btn').onclick = function() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getEmojiMap(), null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "emoji_shortcuts_backup.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        // ייבוא בלחיצה
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

        document.getElementById('close-settings').onclick = () => modal.remove();
    }

    createSettingsButton();
})();
