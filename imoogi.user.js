// ==UserScript==
// @name         Emoji Shortcut & Menu Replacer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  חלופה אוטומטית של קיצורים לאימוג'ים, תפריט בחירה וכפתור הגדרות
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // ברירת מחדל של אימוג'ים
    const defaultEmojis = {
        "/מצחיק/": "😊",
        "/לב/": "❤️",
        "/תודה/": "🙏",
        "/אש/": "🔥",
        "/בוז/": "👎",
        "/לייק/": "👍"
    };

    // טעינת קיצורים שמורים
    function getEmojiMap() {
        return GM_getValue("emojiMap", defaultEmojis);
    }

    function setEmojiMap(map) {
        GM_setValue("emojiMap", map);
    }

    // מצב הסקריפט (פעיל / כבוי)
    function isEnabled() {
        return GM_getValue("scriptEnabled", true);
    }

    function setEnabled(val) {
        GM_setValue("scriptEnabled", val);
    }

    // -------------------------------------------------------------
    // 1. זיהוי והחלפת טקסט
    // -------------------------------------------------------------
    document.addEventListener('input', function(e) {
        if (!isEnabled()) return;

        const target = e.target;
        if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return;
        }

        let text = target.isContentEditable ? target.innerText : target.value;
        const emojiMap = getEmojiMap();

        // בדיקה עבור תפריט בחירה
        if (text.includes('/בחירה/')) {
            replaceText(target, '/בחירה/', '');
            openSelectionMenu(target);
            return;
        }

        // בדיקת החלפות רגילות
        for (const [shortcut, emoji] of Object.entries(emojiMap)) {
            if (text.includes(shortcut)) {
                replaceText(target, shortcut, emoji);
            }
        }
    }, true);

    function replaceText(element, search, replace) {
        if (element.isContentEditable) {
            element.innerText = element.innerText.replace(search, replace);
        } else {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            element.value = element.value.replace(search, replace);
            element.setSelectionRange(start, end);
        }
    }

    // -------------------------------------------------------------
    // 2. תפריט בחירת אימוג'י (/בחירה/)
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
            border: 2px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 999999;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            max-width: 300px;
            direction: rtl;
        `;

        const emojiMap = getEmojiMap();
        const emojisList = Object.values(emojiMap);

        emojisList.forEach(emoji => {
            const btn = document.createElement('button');
            btn.innerText = emoji;
            btn.style.cssText = `
                font-size: 22px;
                padding: 5px;
                cursor: pointer;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
            `;
            btn.onclick = function() {
                insertAtCaret(activeInput, emoji);
                menu.remove();
            };
            menu.appendChild(btn);
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'סגור';
        closeBtn.style.cssText = 'grid-column: span 5; padding: 5px; cursor: pointer; margin-top: 5px;';
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
    // 3. כפתור הגדרות וממשק ניהול
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
            width: 320px;
            direction: rtl;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        let html = `
            <h3 style="margin-top:0;">הגדרות סקריפט אימוג'ים</h3>
            <label style="display:block; margin-bottom: 15px;">
                <input type="checkbox" id="toggle-script" ${isEnabled() ? 'checked' : ''}>
                הפעל סקריפט (כבה לכיסוי/השבתה)
            </label>
            <hr>
            <h4>הוספת קיצור חדש</h4>
            <div style="display:flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="new-shortcut" placeholder="/קיצור/" style="width: 50%; padding: 4px;">
                <input type="text" id="new-emoji" placeholder="😊" style="width: 30%; padding: 4px;">
                <button id="add-btn" style="width: 20%;">הוסף</button>
            </div>
            <hr>
            <h4>קיצורים קיימים</h4>
            <div id="shortcuts-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;"></div>
            <button id="close-settings" style="width: 100%; padding: 8px; cursor: pointer;">סגור</button>
        `;

        modal.innerHTML = html;
        document.body.appendChild(modal);

        // עדכון מצב הפעלה
        document.getElementById('toggle-script').onchange = function(e) {
            setEnabled(e.target.checked);
        };

        // רשימת קיצורים
        function renderList() {
            const listDiv = document.getElementById('shortcuts-list');
            listDiv.innerHTML = '';
            const map = getEmojiMap();

            for (const [key, val] of Object.entries(map)) {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-space-between; align-items: center; margin-bottom: 5px;';
                row.innerHTML = `
                    <span><b>${key}</b> ➔ ${val}</span>
                    <button style="color: red; cursor: pointer; border: none; background: none;">✖</button>
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

        // הוספת קיצור
        document.getElementById('add-btn').onclick = function() {
            const shortcut = document.getElementById('new-shortcut').value.trim();
            const emoji = document.getElementById('new-emoji').value.trim();

            if (shortcut && emoji) {
                const map = getEmojiMap();
                map[shortcut] = emoji;
                setEmojiMap(map);
                renderList();
                document.getElementById('new-shortcut').value = '';
                document.getElementById('new-emoji').value = '';
            }
        };

        document.getElementById('close-settings').onclick = () => modal.remove();
    }

    // טעינת כפתור ההגדרות
    createSettingsButton();
})();