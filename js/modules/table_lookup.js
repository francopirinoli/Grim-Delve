import { I18n } from '../utils/i18n.js';
import { Dice } from '../utils/dice.js';

export const TableLookup = {
    
    // State
    container: null,

    init: async (container) => {
        TableLookup.container = container;
        
        // Load Table Data if not already loaded
        const data = I18n.getData('tables');
        
        if (!data) {
            container.innerHTML = `<p style="padding:2rem; text-align:center;">Error: Table data not loaded.</p>`;
            return;
        }

        TableLookup.renderLayout(data);
    },

    renderLayout: (data) => {
        // Group by Category
        const categories = {};
        data.tables.forEach(t => {
            if (!categories[t.category]) categories[t.category] = [];
            categories[t.category].push(t);
        });

        const html = `
            <div class="table-layout">
                <!-- Sidebar -->
                <div class="table-sidebar">
                    <div class="table-search">
                        <input type="text" id="table-search-input" placeholder="Search Tables...">
                    </div>
                    <div class="table-list" id="table-list">
                        ${TableLookup.renderSidebarList(categories)}
                    </div>
                </div>

                <!-- Main View -->
                <div class="table-content" id="table-view">
                    <div class="placeholder-msg">
                        <div style="font-size:3rem; margin-bottom:1rem;">🎲</div>
                        Select a table from the sidebar to roll.
                    </div>
                </div>
            </div>
        `;
        
        TableLookup.container.innerHTML = html;

        // Listeners
        document.getElementById('table-search-input').addEventListener('input', (e) => {
            TableLookup.filterList(e.target.value);
        });

        // Use event delegation for table buttons
        document.getElementById('table-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('table-btn')) {
                document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                TableLookup.loadTable(e.target.dataset.id);
            }
        });
    },

    renderSidebarList: (categories) => {
        let html = "";
        for (const [cat, tables] of Object.entries(categories)) {
            html += `<div class="table-category"><h5>${cat}</h5>`;
            tables.forEach(t => {
                html += `<button class="table-btn" data-id="${t.id}">${t.title}</button>`;
            });
            html += `</div>`;
        }
        return html;
    },

    loadTable: (tableId) => {
        const data = I18n.getData('tables');
        const table = data.tables.find(t => t.id === tableId);
        const view = document.getElementById('table-view');

        if (!table) return;

        let html = `
            <div class="active-table-header">
                <h3>${table.title}</h3>
                <button id="btn-roll-table" class="roll-table-btn">
                    🎲 Roll ${table.dice}
                </button>
            </div>
            <div class="table-scroll">
                <table class="data-table" id="active-table-el">
                    <thead><tr><th width="80px">Roll</th><th>Result</th></tr></thead>
                    <tbody>
                        ${table.rows.map(row => `
                            <tr data-roll="${row.roll}">
                                <td><span class="roll-badge">${row.roll}</span></td>
                                <td>${row.result}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        view.innerHTML = html;

        // Bind the specific roll button
        document.getElementById('btn-roll-table').onclick = () => {
            TableLookup.rollOnTable(tableId);
        };
    },

    rollOnTable: (tableId) => {
        const data = I18n.getData('tables');
        const table = data.tables.find(t => t.id === tableId);
        const result = Dice.roll(table.dice).total;

        // Highlight Row
        const rows = document.querySelectorAll('#active-table-el tbody tr');
        rows.forEach(r => r.classList.remove('highlight'));

        for (const tr of rows) {
            // Simple integer match. If we add ranges later (e.g., 1-4), update this logic.
            if (parseInt(tr.dataset.roll) === result) {
                tr.classList.add('highlight');
                tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    },

    filterList: (term) => {
        const lower = term.toLowerCase();
        document.querySelectorAll('.table-btn').forEach(btn => {
            const match = btn.textContent.toLowerCase().includes(lower);
            btn.style.display = match ? 'block' : 'none';
        });

        // Hide empty categories
        document.querySelectorAll('.table-category').forEach(cat => {
            const visibleChildren = cat.querySelectorAll('.table-btn[style="display: block;"]').length;
            cat.style.display = visibleChildren > 0 ? 'block' : 'none';
        });
    }
};