// Global `SONGS` array is loaded from data.js

// Affiliate tokens — fill in after approval
const AM_AFFILIATE_TOKEN = ""; // Apple Music (Partnerize): https://affiliate.itunes.apple.com/
const SP_AFFILIATE_TAG = "";   // Spotify (Impact): https://artists.spotify.com/affiliate-program

const I18N = {
    ja: {
        subtitle: 'スタンダード名で、ギタリストの名テイクを探す',
        searchPlaceholder: '例: Autumn Leaves, All The Things You Are …',
        resultUnit: '件',
        searchHint: '曲名を入力し、候補を選ぶとギタリストと収録アルバムを表示します。',
        noData: 'データが見つかりませんでした',
        colGuitarist: 'ギタリスト',
        colAlbums: '収録アルバム',
        colLinks: 'リンク',
        metaDescription: 'ジャズ・スタンダードのギタリスト名演を検索。黒本 Vol.1+2 全曲対応。',
        langToggleLabel: 'English',
        htmlLang: 'ja',
    },
    en: {
        subtitle: 'A database of jazz guitar recordings of jazz standards.',
        searchPlaceholder: 'e.g. Autumn Leaves, All The Things You Are …',
        resultUnit: 'results',
        searchHint: 'Enter a jazz standard and select a title to see guitarists and albums.',
        noData: 'No data found',
        colGuitarist: 'Guitarist',
        colAlbums: 'Albums',
        colLinks: 'Links',
        metaDescription: 'Explore jazz guitar recordings of classic standards. Find guitarists, albums, and links to music services.',
        langToggleLabel: '日本語',
        htmlLang: 'en',
    },
};

let lang = localStorage.getItem('jgd_lang') === 'ja' ? 'ja' : 'en';
const t = (key) => I18N[lang][key];

function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.getElementById('htmlRoot').lang = t('htmlLang');
    document.getElementById('metaDescription').setAttribute('content', t('metaDescription'));
    document.getElementById('langToggle').textContent = t('langToggleLabel');
}

document.addEventListener('DOMContentLoaded', () => {
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsHeader = document.getElementById('resultsHeader');
    const resultCount = document.getElementById('resultCount');
    const searchHint = document.getElementById('searchHint');
    const resultSummary = document.getElementById('resultSummary');

    const songInput = document.getElementById('searchInput');
    const songAc = document.getElementById('autocompleteList');

    // selected: { type: 'song', name: string } | null
    let selected = null;

    applyStaticI18n();
    document.getElementById('langToggle').addEventListener('click', () => {
        lang = lang === 'ja' ? 'en' : 'ja';
        localStorage.setItem('jgd_lang', lang);
        applyStaticI18n();
        render();
    });

    document.getElementById('logo').addEventListener('click', () => {
        songInput.value = '';
        songAc.innerHTML = '';
        songAc.classList.remove('active');
        selected = null;
        render();
    });

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    // ----- Indexes -----
    const songTitles = SONGS.map(s => s.title);

    // Title-prefix only. Whitespace in the query is ignored so "a u tu m"
    // still matches "Autumn Leaves". A leading "The " in titles is stripped
    // so "The Shadow of Your Smile" is reachable via "s".
    const squish = (s) => s.toLowerCase().replace(/\s+/g, '');

    function rankMatches(names, query) {
        const q = squish(query);
        if (!q) return [];
        const out = [];
        for (const name of names) {
            const lower = name.toLowerCase();
            const flat = squish(lower);
            const flatStripped = squish(lower.replace(/^the\s+/, ''));
            if (flat.startsWith(q) || flatStripped.startsWith(q)) {
                out.push(name);
            }
        }
        return out;
    }

    const MAX_SUGGESTIONS = 30;

    // ----- Helpers -----
    function buildPlatformLinks(query) {
        const q = encodeURIComponent(query);
        const amBase = `https://music.apple.com/jp/search?term=${q}&app=music`;
        const amUrl = AM_AFFILIATE_TOKEN ? `${amBase}&at=${encodeURIComponent(AM_AFFILIATE_TOKEN)}` : amBase;
        const spBase = `https://open.spotify.com/search/${q}`;
        const spUrl = SP_AFFILIATE_TAG ? `${spBase}?si=${encodeURIComponent(SP_AFFILIATE_TAG)}` : spBase;
        const ytUrl = `https://www.youtube.com/results?search_query=${q}`;
        return `
            <a href="${amUrl}" target="_blank" rel="noopener" class="platform-btn am">Apple Music</a>
            <a href="${spUrl}" target="_blank" rel="noopener" class="platform-btn sp">Spotify</a>
            <a href="${ytUrl}" target="_blank" rel="noopener" class="platform-btn yt">YouTube</a>
        `;
    }

    // ----- Song search -----
    songInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        songAc.innerHTML = '';
        selected = null;
        render();

        if (val === '') {
            songAc.classList.remove('active');
            render();
            return;
        }

        const matches = rankMatches(songTitles, val);
        if (matches.length === 0) {
            songAc.classList.remove('active');
            render();
            return;
        }

        songAc.classList.add('active');
        matches.slice(0, MAX_SUGGESTIONS).forEach((title, i) => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item';
            li.textContent = title;
            li.addEventListener('mouseenter', () => setHighlight(songAc, i));
            li.addEventListener('click', () => {
                songInput.value = title;
                selected = { type: 'song', name: title };
                songAc.classList.remove('active');
                render();
            });
            songAc.appendChild(li);
        });
        setHighlight(songAc, 0);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            songAc.classList.remove('active');
        }
    });

    // ----- Keyboard navigation (↑/↓/Enter/Esc) -----
    function setHighlight(list, idx) {
        const prev = list.querySelector('.autocomplete-item.highlighted');
        if (prev) prev.classList.remove('highlighted');
        const items = list.children;
        const next = items[idx];
        if (!next) return;
        next.classList.add('highlighted');
        next.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }

    function installKeyboardNav(input, list) {
        input.addEventListener('keydown', (e) => {
            const items = list.querySelectorAll('.autocomplete-item');
            const isOpen = list.classList.contains('active') && items.length > 0;

            if (e.key === 'Escape') {
                list.classList.remove('active');
                return;
            }
            if (!isOpen) return;

            const current = list.querySelector('.autocomplete-item.highlighted');
            let idx = current ? Array.from(items).indexOf(current) : -1;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                idx = (idx + 1) % items.length;
                setHighlight(list, idx);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                idx = (idx - 1 + items.length) % items.length;
                setHighlight(list, idx);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const target = idx >= 0 ? items[idx] : items[0];
                target.click();
            }
        });
    }

    installKeyboardNav(songInput, songAc);

    // ----- Render -----
    function render() {
        searchHint.hidden = Boolean(selected);
        resultSummary.hidden = !selected;
        resultsGrid.hidden = !selected;
        if (!selected) {
            resultsGrid.innerHTML = '';
            resultCount.textContent = '0';
            resultsHeader.style.display = 'none';
            return;
        }
        renderSong(selected.name);
    }

    function renderSong(title) {
        const song = SONGS.find(s => s.title === title);
        const takes = song ? [...(song.takes || [])] : [];
        takes.sort((a, b) => (a.guitarist || "").localeCompare(b.guitarist || ""));
        resultCount.textContent = takes.length;
        resultsGrid.innerHTML = '';

        if (takes.length === 0) {
            resultsGrid.innerHTML = `<div class="empty-state">${esc(t('noData'))}</div>`;
            resultsHeader.style.display = 'none';
            return;
        }

        resultsHeader.style.display = 'grid';

        takes.forEach(take => {
            const guitarist = take.guitarist || "Unknown";
            const albumsHtml = (take.albums || []).map(alb =>
                `<li class="album-item"><span class="alb-title">${esc(alb.title)}</span> <span class="alb-year">(${esc(alb.year)})</span></li>`
            ).join('');

            const card = document.createElement('div');
            card.className = 'take-card';
            card.innerHTML = `
                <h3 class="item-guitarist">${esc(guitarist)}</h3>
                <ul class="item-albums-list">${albumsHtml}</ul>
                <div class="platform-links">${buildPlatformLinks(`${guitarist} ${song.title}`)}</div>
            `;
            resultsGrid.appendChild(card);
        });
    }

    render();
});
