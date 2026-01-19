/**
 * dice_ui.js
 * Visual interface for dice rolls.
 * Features: Floating Toasts for immediate results, Side Panel for history.
 */

import { I18n } from '../utils/i18n.js';

export const DiceUI = {
    
    container: null,
    logContainer: null,

    init: () => {
        // Create UI elements if they don't exist
        if (!document.getElementById('dice-ui-layer')) {
            const layer = document.createElement('div');
            layer.id = 'dice-ui-layer';
            layer.innerHTML = `
                <div id="dice-toast-anchor"></div>
                <div id="dice-log-tray" class="collapsed">
                    <div class="dice-log-header" id="dice-log-toggle">
                        <span>🎲 History</span>
                        <span class="toggle-icon">▲</span>
                    </div>
                    <div id="dice-log-content"></div>
                    <div class="dice-log-actions">
                        <button id="btn-clear-log">Clear</button>
                    </div>
                </div>
            `;
            document.body.appendChild(layer);
            
            // Bind Toggle
            document.getElementById('dice-log-toggle').addEventListener('click', () => {
                const tray = document.getElementById('dice-log-tray');
                tray.classList.toggle('collapsed');
                const icon = tray.querySelector('.toggle-icon');
                icon.textContent = tray.classList.contains('collapsed') ? '▲' : '▼';
            });

            document.getElementById('btn-clear-log').addEventListener('click', () => {
                document.getElementById('dice-log-content').innerHTML = '';
            });
        }
        
        DiceUI.container = document.getElementById('dice-toast-anchor');
        DiceUI.logContainer = document.getElementById('dice-log-content');
    },

    /**
     * Display a result.
     * @param {string} label - e.g., "Longsword Attack"
     * @param {object} result - The object returned from Dice.roll() or Dice.rollCheck()
     * @param {string} type - "attack", "damage", "check", "save"
     */
    show: (label, result, type = "check") => {
        DiceUI.createToast(label, result, type);
        DiceUI.addToLog(label, result, type);
    },

    createToast: (label, result, type) => {
        const toast = document.createElement('div');
        toast.className = `dice-toast ${type} pop-in`;
        
        let valueHTML = '';
        let detailHTML = '';

        // CHECK ROLL (d20 + Mod + Prof)
        if (result.d20_result !== undefined) {
            const nat = result.d20_result;
            const critClass = nat === 20 ? 'crit-success' : (nat === 1 ? 'crit-fail' : '');
            
            valueHTML = `<span class="toast-total ${critClass}">${result.total}</span>`;
            
            // Build Detail String: "d20(15) + 3 + 2"
            // Use safe defaults (|| 0) to prevent NaN
            const stat = result.stat_mod || 0;
            const prof = result.prof_result || 0;
            
            detailHTML = `d20(<span class="${critClass}">${nat}</span>)`;
            
            if (stat !== 0) {
                detailHTML += ` ${stat >= 0 ? '+' : '-'} ${Math.abs(stat)}`;
            }
            if (prof !== 0) {
                detailHTML += ` + ${prof}`; // Proficiency is usually positive
            }
        } 
        // DAMAGE / GENERIC ROLL
        else {
            valueHTML = `<span class="toast-total">${result.total}</span>`;
            
            // Handle "1d6-1" logic safely
            if (result.rolls && result.rolls.length > 0) {
                detailHTML = `[${result.rolls.join(', ')}]`;
                const mod = result.modifier || 0;
                if (mod !== 0) {
                    detailHTML += ` ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}`;
                }
            } else {
                detailHTML = result.notation || "";
            }
        }

        toast.innerHTML = `
            <div class="toast-label">${label}</div>
            <div class="toast-main">${valueHTML}</div>
            <div class="toast-detail">${detailHTML}</div>
        `;

        DiceUI.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('pop-in');
            toast.classList.add('pop-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    addToLog: (label, result, type) => {
        const item = document.createElement('div');
        item.className = 'log-item';
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let content = '';

        // CHECK ROLL (d20 + Mod + Prof)
        if (result.d20_result !== undefined) {
             const nat = result.d20_result;
             const style = nat === 20 ? 'color:var(--accent-gold)' : (nat === 1 ? 'color:var(--accent-crimson)' : '');
             
             // Build breakdown string: "d20(15) + 3 + d4(2)"
             let mathStr = `d20(<span style="${style}">${nat}</span>)`;
             
             if (result.stat_mod !== 0) {
                 const sign = result.stat_mod >= 0 ? '+' : '-';
                 mathStr += ` ${sign} ${Math.abs(result.stat_mod)}`;
             }
             
             if (result.prof_die_val > 0) {
                 mathStr += ` + d${result.prof_die_val}(${result.prof_result})`;
             }

             content = `
                <div class="log-top"><span class="log-label">${label}</span> <span class="log-time">${time}</span></div>
                <div class="log-mid">
                    <span class="log-total" style="${style}">${result.total}</span>
                    <span class="log-formula">${mathStr}</span>
                </div>
             `;
        } 
        // DAMAGE/GENERIC ROLL
        else {
             // Handle "1d6-1" logic
             let notation = result.notation || "";
             let detail = "";

             // Show rolls if available: "[4] - 1"
             if (result.rolls && result.rolls.length > 0) {
                 detail = `[${result.rolls.join(', ')}]`;
                 if (result.modifier !== 0) {
                     const sign = result.modifier >= 0 ? '+' : '-';
                     detail += ` ${sign} ${Math.abs(result.modifier)}`;
                 }
             }

             content = `
                <div class="log-top"><span class="log-label">${label}</span> <span class="log-time">${time}</span></div>
                <div class="log-mid">
                    <span class="log-total">${result.total}</span>
                    <span class="log-formula">${detail || notation}</span>
                </div>
             `;
        }

        item.innerHTML = content;
        DiceUI.logContainer.insertBefore(item, DiceUI.logContainer.firstChild);
    }

};