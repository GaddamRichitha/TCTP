#!/usr/bin/env python3
"""
Generate the fully dynamic TCTP HTML file with:
  1. Login / Signup auth screen (localStorage-based)
  2. Settings page (all previously-hardcoded values now editable)
  3. Dynamic sensitivity scenarios, category labels/colors, tracking months, etc.
  4. localStorage persistence for settings + user data
"""

import re

# ── Read the original file ──────────────────────────────────────────
SRC = "/home/z/my-project/upload/TCTP_Software_Simulation_2.html"
DST = "/home/z/my-project/download/TCTP_Software_Simulation_Dynamic.html"

with open(SRC, "r", encoding="utf-8") as f:
    original = f.read()

# ═══════════════════════════════════════════════════════════════════
# 1.  ADD AUTH + SETTINGS CSS (inject before closing </style>)
# ═══════════════════════════════════════════════════════════════════
auth_css = """

/* ── AUTH SCREEN ─────────────────────────────────────────────── */
.auth-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
}
.auth-overlay.hidden { display: none; }
.auth-card {
  width: 100%; max-width: 420px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r12); padding: 32px; box-shadow: 0 12px 40px rgba(15,25,35,.12);
}
.auth-logo { font-size: 28px; font-weight: 800; text-align: center; letter-spacing: -0.5px; margin-bottom: 4px; }
.auth-logo span { color: var(--blue-mid); }
.auth-sub { font-size: 12px; color: var(--ink3); text-align: center; margin-bottom: 24px; }
.auth-tab-bar { display: flex; gap: 0; background: var(--bg); border-radius: var(--r8); padding: 3px; margin-bottom: 20px; }
.auth-tab { flex: 1; padding: 8px; border: none; background: none; font-size: 13px; font-weight: 600;
  border-radius: 6px; cursor: pointer; color: var(--ink3); transition: all .15s; text-align: center; }
.auth-tab.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.auth-form { display: none; }
.auth-form.active { display: block; }
.auth-field { margin-bottom: 14px; }
.auth-field label { display: block; font-size: 12px; font-weight: 600; color: var(--ink2); margin-bottom: 5px; }
.auth-field input { width: 100%; border: 1px solid var(--border2); border-radius: var(--r8);
  padding: 9px 12px; font-size: 13px; background: var(--surface); color: var(--ink);
  outline: none; font-family: inherit; transition: border-color .15s; box-sizing: border-box; }
.auth-field input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(26,108,240,.1); }
.auth-field .field-error { font-size: 11px; color: var(--red); margin-top: 3px; display: none; }
.auth-field.has-error .field-error { display: block; }
.auth-field.has-error input { border-color: var(--red); }
.auth-btn { width: 100%; padding: 10px; border: none; border-radius: var(--r8);
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all .15s; margin-top: 4px; }
.auth-btn-primary { background: var(--blue); color: #fff; }
.auth-btn-primary:hover { background: var(--blue-dk); }
.auth-error-banner { background: var(--red-lt); color: var(--red); border: 1px solid #fca5a5;
  border-radius: var(--r8); padding: 10px 14px; font-size: 12px; font-weight: 600;
  margin-bottom: 14px; display: none; }
.auth-error-banner.show { display: block; }
.auth-success-banner { background: var(--green-lt); color: var(--green); border: 1px solid #86efac;
  border-radius: var(--r8); padding: 10px 14px; font-size: 12px; font-weight: 600;
  margin-bottom: 14px; display: none; }
.auth-success-banner.show { display: block; }
.auth-toggle-text { text-align: center; font-size: 12px; color: var(--ink3); margin-top: 16px; }
.auth-toggle-text a { color: var(--blue); font-weight: 600; cursor: pointer; text-decoration: none; }
.auth-toggle-text a:hover { text-decoration: underline; }
.password-strength { height: 4px; border-radius: 2px; background: var(--bg); margin-top: 6px; overflow: hidden; }
.password-strength-fill { height: 100%; border-radius: 2px; transition: width .3s, background .3s; width: 0; }
.password-strength-text { font-size: 10px; color: var(--ink3); margin-top: 2px; }

/* ── USER MENU IN APP BAR ────────────────────────────────────── */
.user-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--blue);
  color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center;
  justify-content: center; cursor: pointer; transition: background .15s; }
.user-avatar:hover { background: var(--blue-dk); }
.user-dropdown { display: none; position: absolute; top: calc(100% + 8px); right: 0; width: 200px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r12);
  box-shadow: 0 8px 24px rgba(15,25,35,.14); z-index: 200; overflow: hidden; }
.user-dropdown.open { display: block; }
.ud-header { padding: 10px 14px; border-bottom: 1px solid var(--border); }
.ud-name { font-size: 13px; font-weight: 700; color: var(--ink); }
.ud-email { font-size: 11px; color: var(--ink3); }
.ud-item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 13px;
  color: var(--ink2); cursor: pointer; transition: background .12s; border: none; background: none;
  width: 100%; text-align: left; font-family: inherit; }
.ud-item:hover { background: var(--bg); }
.ud-item.danger { color: var(--red); }

/* ── SETTINGS PAGE ───────────────────────────────────────────── */
.settings-row { display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid var(--border); }
.settings-row:last-child { border-bottom: none; }
.settings-row-label { flex: 1; }
.settings-row-label .sr-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.settings-row-label .sr-desc { font-size: 11px; color: var(--ink3); margin-top: 2px; }
.settings-actions { display: flex; gap: 10px; margin-top: 20px; }

@media (max-width: 768px) {
  .settings-row { flex-direction: column; align-items: flex-start; gap: 6px; }
}
"""

original = original.replace("</style>", auth_css + "\n</style>")

# ═══════════════════════════════════════════════════════════════════
# 2.  ADD AUTH OVERLAY HTML (inject right after <body>)
# ═══════════════════════════════════════════════════════════════════
auth_html = r"""
<!-- AUTH SCREEN -->
<div class="auth-overlay" id="auth-overlay">
  <div class="auth-card">
    <div class="auth-logo">TC<span>TP</span></div>
    <div class="auth-sub">Target Cost &middot; Target Profit</div>
    <div class="auth-error-banner" id="auth-error"></div>
    <div class="auth-success-banner" id="auth-success"></div>
    <div class="auth-tab-bar">
      <button class="auth-tab active" onclick="switchAuthTab('login')">Sign in</button>
      <button class="auth-tab" onclick="switchAuthTab('signup')">Sign up</button>
    </div>
    <form class="auth-form active" id="form-login" onsubmit="handleLogin(event)">
      <div class="auth-field" id="lf-username">
        <label for="login-username">Username</label>
        <input type="text" id="login-username" placeholder="Enter your username" required autocomplete="username">
        <div class="field-error">Username is required</div>
      </div>
      <div class="auth-field" id="lf-password">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
        <div class="field-error">Password is required</div>
      </div>
      <button type="submit" class="auth-btn auth-btn-primary">Sign in</button>
      <div class="auth-toggle-text">Don't have an account? <a onclick="switchAuthTab('signup')">Create one</a></div>
    </form>
    <form class="auth-form" id="form-signup" onsubmit="handleSignup(event)">
      <div class="auth-field" id="sf-fullname">
        <label for="signup-fullname">Full name</label>
        <input type="text" id="signup-fullname" placeholder="John Doe">
        <div class="field-error"></div>
      </div>
      <div class="auth-field" id="sf-email">
        <label for="signup-email">Email address</label>
        <input type="email" id="signup-email" placeholder="you@example.com" required>
        <div class="field-error">Please enter a valid email address</div>
      </div>
      <div class="auth-field" id="sf-username">
        <label for="signup-username">Username</label>
        <input type="text" id="signup-username" placeholder="Choose a username" required autocomplete="username" minlength="3">
        <div class="field-error">Username must be at least 3 characters</div>
      </div>
      <div class="auth-field" id="sf-password">
        <label for="signup-password">Password</label>
        <input type="password" id="signup-password" placeholder="Create a password" required minlength="6" oninput="checkPasswordStrength(this.value)" autocomplete="new-password">
        <div class="field-error">Password must be at least 6 characters</div>
        <div class="password-strength"><div class="password-strength-fill" id="pw-strength-fill"></div></div>
        <div class="password-strength-text" id="pw-strength-text"></div>
      </div>
      <div class="auth-field" id="sf-confirm">
        <label for="signup-confirm">Confirm password</label>
        <input type="password" id="signup-confirm" placeholder="Re-enter your password" required autocomplete="new-password">
        <div class="field-error">Passwords do not match</div>
      </div>
      <button type="submit" class="auth-btn auth-btn-primary">Create account</button>
      <div class="auth-toggle-text">Already have an account? <a onclick="switchAuthTab('login')">Sign in</a></div>
    </form>
  </div>
</div>
<div class="toast" id="toast"></div>
"""

original = original.replace("<body>\n", "<body>\n" + auth_html)

# ═══════════════════════════════════════════════════════════════════
# 3.  MODIFY APP BAR
# ═══════════════════════════════════════════════════════════════════
old_appbar = '''<div class="app-bar">
  <div class="app-bar-brand">
    <div class="app-bar-logo">TC<span>TP</span></div>
    <div class="app-bar-sub">Software Financial Simulator</div>
  </div>
  <div class="app-bar-right">
    <div class="live-label"><span class="live-dot"></span> Live calculations</div>
    <div class="app-bar-badge">v1.0</div>
  </div>
</div>'''

new_appbar = '''<div class="app-bar" id="app-bar-main">
  <div class="app-bar-brand">
    <div class="app-bar-logo" id="app-logo">TC<span>TP</span></div>
    <div class="app-bar-sub" id="app-subtitle">Software Financial Simulator</div>
  </div>
  <div class="app-bar-right">
    <div class="live-label"><span class="live-dot"></span> Live calculations</div>
    <div class="app-bar-badge" id="app-version-badge">v1.0</div>
    <div style="position:relative" id="user-menu-container">
      <div class="user-avatar" id="user-avatar" onclick="toggleUserMenu()" title="User menu">?</div>
      <div class="user-dropdown" id="user-dropdown">
        <div class="ud-header">
          <div class="ud-name" id="ud-name">User</div>
          <div class="ud-email" id="ud-email">user@example.com</div>
        </div>
        <button class="ud-item" onclick="showPage('settings'); closeUserMenu();">&#9881; Settings</button>
        <button class="ud-item danger" onclick="handleLogout()">&#8618; Sign out</button>
      </div>
    </div>
  </div>
</div>'''

original = original.replace(old_appbar, new_appbar)

# ═══════════════════════════════════════════════════════════════════
# 4.  ADD SETTINGS NAV ITEM TO SIDEBAR
# ═══════════════════════════════════════════════════════════════════
old_nav = '''    <div class="nav-item" onclick="showPage('report')" id="nav-report">
      <div class="nav-icon">&#128203;</div> Report
    </div>
  </div>'''

new_nav = '''    <div class="nav-item" onclick="showPage('report')" id="nav-report">
      <div class="nav-icon">&#128203;</div> Report
    </div>
    <div class="nav-item" onclick="showPage('settings')" id="nav-settings">
      <div class="nav-icon">&#9881;</div> Settings
    </div>
  </div>'''

original = original.replace(old_nav, new_nav)

# ═══════════════════════════════════════════════════════════════════
# 5.  ADD SETTINGS PAGE HTML
# ═══════════════════════════════════════════════════════════════════
settings_html = r'''

<!-- PAGE: SETTINGS -->
<div class="page" id="page-settings">
  <div class="page-header">
    <div><div class="ph-title">Settings</div><div class="ph-sub">Configure app appearance, categories, sensitivity scenarios, and defaults</div></div>
  </div>
  <div class="content">

    <div class="card section-gap">
      <div class="card-header"><div><div class="card-title">Application configuration</div><div class="card-sub">Customize branding and version displayed in the header</div></div></div>
      <div class="form-grid g2">
        <div class="field">
          <label class="field-label">App title</label>
          <input type="text" id="s-appTitle" value="TCTP" oninput="previewSetting('appTitle')">
          <div class="field-hint">Displayed in the top-left logo area</div>
        </div>
        <div class="field">
          <label class="field-label">App subtitle</label>
          <input type="text" id="s-appSubtitle" value="Software Financial Simulator" oninput="previewSetting('appSubtitle')">
        </div>
        <div class="field">
          <label class="field-label">Version label</label>
          <input type="text" id="s-version" value="v1.0" oninput="previewSetting('version')">
        </div>
        <div class="field">
          <label class="field-label">Accent color (logo highlight)</label>
          <input type="color" id="s-accentColor" value="#3d7ef5" oninput="previewSetting('accentColor')" style="width:60px;height:36px;padding:2px;cursor:pointer;border:1px solid var(--border2);border-radius:var(--r8)">
        </div>
      </div>
    </div>

    <div class="card section-gap">
      <div class="card-header"><div><div class="card-title">Cost category configuration</div><div class="card-sub">Rename categories and change their colors &#8212; used everywhere in charts, sidebar, and reports</div></div></div>
      <div id="settings-categories"></div>
    </div>

    <div class="card section-gap">
      <div class="card-header"><div><div class="card-title">Tracking &amp; time configuration</div><div class="card-sub">Defaults for time tracking, cash flow projection, and EVM calculations</div></div></div>
      <div class="form-grid g2">
        <div class="field">
          <label class="field-label">Max tracking months displayed</label>
          <input type="number" id="s-maxTrackMonths" value="24" min="1" max="120">
          <div class="field-hint">Months shown in Time Tracking table (capped at project duration)</div>
        </div>
        <div class="field">
          <label class="field-label">Default planned hours / month</label>
          <input type="number" id="s-defaultPlannedHours" value="160" min="1" max="744">
          <div class="field-hint">Pre-filled when adding a new labour row</div>
        </div>
        <div class="field">
          <label class="field-label">Cash flow projection months</label>
          <input type="number" id="s-cashflowMonths" value="24" min="1" max="120">
          <div class="field-hint">Number of months shown in the cash flow chart</div>
        </div>
        <div class="field">
          <label class="field-label">EVM trend chart width (px)</label>
          <input type="number" id="s-evmChartWidth" value="680" min="300" max="1200">
          <div class="field-hint">Width of the planned vs actual cost curve SVG</div>
        </div>
      </div>
    </div>

    <div class="card section-gap">
      <div class="card-header"><div><div class="card-title">Sensitivity scenario multipliers</div><div class="card-sub">Customize the cost and price multipliers used in the sensitivity analysis table</div></div></div>
      <div class="info-box" style="margin-bottom:16px">
        &#128161; <strong>How it works:</strong> Each scenario applies a cost multiplier and/or price multiplier to the base case. A cost multiplier of 1.30 means costs are 30% higher. A price multiplier of 0.90 means selling price is 10% lower.
      </div>
      <div id="settings-scenarios" style="overflow-x:auto"></div>
    </div>

    <div class="card">
      <div class="card-header"><div><div class="card-title">Data management</div><div class="card-sub">Save, load, or reset your configuration and project data</div></div></div>
      <div class="settings-actions">
        <button class="btn btn-primary" onclick="saveAllSettings()">Save all settings</button>
        <button class="btn btn-secondary" onclick="resetSettingsToDefaults()">Reset to defaults</button>
        <button class="btn btn-danger" onclick="clearAllData()">Clear all data</button>
      </div>
    </div>

  </div>
</div>

'''

# Insert before the closing </div></div>\n\n<script>
original = original.replace(
    '</div>\n</div>\n\n<script>',
    '</div>\n' + settings_html + '</div>\n\n<script>'
)

# ═══════════════════════════════════════════════════════════════════
# 6.  MAKE const MUTABLE
# ═══════════════════════════════════════════════════════════════════
original = original.replace("const CAT_COLORS = {", "let CAT_COLORS = {")
original = original.replace("const CAT_LABELS = {", "let CAT_LABELS = {")
original = original.replace("const actualHours = {};", "let actualHours = {};")
original = original.replace("const MAX_TRACK_MONTHS = 24;", "// MAX_TRACK_MONTHS is now set by settings\nlet MAX_TRACK_MONTHS = 24;")

# ═══════════════════════════════════════════════════════════════════
# 7.  ADD ALL NEW JS + MODIFY INIT
# ═══════════════════════════════════════════════════════════════════
new_js_block = r"""

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC SETTINGS SYSTEM
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  appTitle: 'TCTP',
  appSubtitle: 'Software Financial Simulator',
  version: 'v1.0',
  accentColor: '#3d7ef5',
  maxTrackMonths: 24,
  defaultPlannedHours: 160,
  cashflowMonths: 24,
  evmChartWidth: 680,
  categories: {
    labour:   { label: 'Labour & team',      color: '#1a6cf0' },
    infra:    { label: 'Cloud / infra',       color: '#0ea8a8' },
    apis:     { label: 'APIs / SaaS',         color: '#7c3aed' },
    llm:      { label: 'LLM / AI',            color: '#d97706' },
    overhead: { label: 'Overhead',             color: '#6b7280' },
  },
  scenarios: [
    { label: 'Cost overrun +30%',   costMult: 1.30, priceMult: 1.00 },
    { label: 'Cost overrun +20%',   costMult: 1.20, priceMult: 1.00 },
    { label: 'Price cut -10%',      costMult: 1.00, priceMult: 0.90 },
    { label: 'Price cut -20%',      costMult: 1.00, priceMult: 0.80 },
    { label: 'Vol -40% + cost +15%', costMult: 1.15, priceMult: 1.00 },
    { label: 'Best case (opt + no overrun)', costMult: 0.90, priceMult: 1.05 },
    { label: 'Worst case (pess + overrun)', costMult: 1.30, priceMult: 0.90 },
  ],
};

let APP_SETTINGS = {};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('tctp_settings');
    if (saved) {
      APP_SETTINGS = deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), JSON.parse(saved));
    } else {
      APP_SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  } catch (e) {
    APP_SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
  applySettings();
}

function applySettings() {
  var s = APP_SETTINGS;
  var logoEl = document.getElementById('app-logo');
  if (logoEl) { var parts = s.appTitle.split(' '); logoEl.innerHTML = esc(parts[0]) + '<span>' + esc(parts.slice(1).join(' ') || 'TP') + '</span>'; }
  var subEl = document.getElementById('app-subtitle');
  if (subEl) subEl.textContent = s.appSubtitle;
  var verEl = document.getElementById('app-version-badge');
  if (verEl) verEl.textContent = s.version;
  document.documentElement.style.setProperty('--blue-mid', s.accentColor);
  for (var i = 0; i < CATS.length; i++) {
    var cat = CATS[i];
    if (s.categories[cat]) {
      CAT_LABELS[cat] = s.categories[cat].label;
      CAT_COLORS[cat] = s.categories[cat].color;
      document.documentElement.style.setProperty('--cat-' + cat, s.categories[cat].color);
    }
  }
  MAX_TRACK_MONTHS = s.maxTrackMonths || 24;
}

function populateSettingsForm() {
  var s = APP_SETTINGS;
  setVal('s-appTitle', s.appTitle);
  setVal('s-appSubtitle', s.appSubtitle);
  setVal('s-version', s.version);
  setVal('s-accentColor', s.accentColor);
  setVal('s-maxTrackMonths', s.maxTrackMonths);
  setVal('s-defaultPlannedHours', s.defaultPlannedHours);
  setVal('s-cashflowMonths', s.cashflowMonths);
  setVal('s-evmChartWidth', s.evmChartWidth);
  renderCategorySettings();
  renderScenarioSettings();
}

function setVal(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

function renderCategorySettings() {
  var container = document.getElementById('settings-categories');
  if (!container) return;
  var html = '';
  CATS.forEach(function(cat) {
    var cfg = APP_SETTINGS.categories[cat] || DEFAULT_SETTINGS.categories[cat];
    html += '<div class="settings-row">' +
      '<div class="settings-row-label">' +
        '<div class="sr-title"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + cfg.color + ';margin-right:6px;vertical-align:middle"></span>Category key: <code>' + cat + '</code></div>' +
        '<div class="sr-desc">Used in sidebar, charts, reports, and exports</div>' +
      '</div>' +
      '<input type="text" id="sc-label-' + cat + '" value="' + esc(cfg.label) + '" style="width:200px;border:1px solid var(--border2);border-radius:var(--r8);padding:7px 10px;font-size:13px;background:var(--surface);color:var(--ink);font-family:inherit;outline:none">' +
      '<input type="color" id="sc-color-' + cat + '" value="' + cfg.color + '">' +
    '</div>';
  });
  container.innerHTML = html;
}

function renderScenarioSettings() {
  var container = document.getElementById('settings-scenarios');
  if (!container) return;
  var scenarios = APP_SETTINGS.scenarios || DEFAULT_SETTINGS.scenarios;
  var html = '<table class="sens-table"><thead><tr><th>Scenario label</th><th class="r">Cost multiplier</th><th class="r">Price multiplier</th></tr></thead><tbody>';
  scenarios.forEach(function(sc, i) {
    html += '<tr>' +
      '<td><input type="text" id="ss-label-' + i + '" value="' + esc(sc.label) + '" style="border:1px solid var(--border2);border-radius:5px;padding:5px 8px;font-size:13px;width:100%;background:var(--surface);color:var(--ink);font-family:inherit;outline:none"></td>' +
      '<td class="r"><input type="number" id="ss-cost-' + i + '" value="' + sc.costMult + '" min="0" max="5" step="0.05" style="border:1px solid var(--border2);border-radius:5px;padding:5px 8px;font-size:13px;width:100px;text-align:right;background:var(--surface);color:var(--ink);font-family:inherit;outline:none"></td>' +
      '<td class="r"><input type="number" id="ss-price-' + i + '" value="' + sc.priceMult + '" min="0" max="5" step="0.05" style="border:1px solid var(--border2);border-radius:5px;padding:5px 8px;font-size:13px;width:100px;text-align:right;background:var(--surface);color:var(--ink);font-family:inherit;outline:none"></td>' +
    '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function saveAllSettings() {
  var s = APP_SETTINGS;
  s.appTitle = getStr('s-appTitle', s.appTitle);
  s.appSubtitle = getStr('s-appSubtitle', s.appSubtitle);
  s.version = getStr('s-version', s.version);
  s.accentColor = getStr('s-accentColor', s.accentColor);
  s.maxTrackMonths = getNum('s-maxTrackMonths', 24);
  s.defaultPlannedHours = getNum('s-defaultPlannedHours', 160);
  s.cashflowMonths = getNum('s-cashflowMonths', 24);
  s.evmChartWidth = getNum('s-evmChartWidth', 680);
  CATS.forEach(function(cat) {
    var labelEl = document.getElementById('sc-label-' + cat);
    var colorEl = document.getElementById('sc-color-' + cat);
    if (labelEl && colorEl) s.categories[cat] = { label: labelEl.value, color: colorEl.value };
  });
  var scenarioCount = (s.scenarios || DEFAULT_SETTINGS.scenarios).length;
  var newScenarios = [];
  for (var i = 0; i < scenarioCount; i++) {
    var labelEl = document.getElementById('ss-label-' + i);
    var costEl = document.getElementById('ss-cost-' + i);
    var priceEl = document.getElementById('ss-price-' + i);
    if (labelEl && costEl && priceEl) {
      newScenarios.push({ label: labelEl.value, costMult: parseFloat(costEl.value) || 1, priceMult: parseFloat(priceEl.value) || 1 });
    }
  }
  s.scenarios = newScenarios;
  localStorage.setItem('tctp_settings', JSON.stringify(s));
  applySettings();
  recalcAll();
  showToast('Settings saved successfully', 'success');
}

function resetSettingsToDefaults() {
  if (!confirm('Reset all settings to defaults? This will not affect your cost data.')) return;
  APP_SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  localStorage.removeItem('tctp_settings');
  populateSettingsForm();
  applySettings();
  recalcAll();
  showToast('Settings reset to defaults', 'info');
}

function clearAllData() {
  if (!confirm('This will clear ALL data including users, settings, and cost items. Are you sure?')) return;
  localStorage.clear();
  location.reload();
}

function previewSetting(key) {
  if (key === 'appTitle') {
    var title = getStr('s-appTitle', APP_SETTINGS.appTitle);
    var logoEl = document.getElementById('app-logo');
    if (logoEl) { var p = title.split(' '); logoEl.innerHTML = esc(p[0]) + '<span>' + esc(p.slice(1).join(' ') || 'TP') + '</span>'; }
  }
  if (key === 'appSubtitle') { var el = document.getElementById('app-subtitle'); if (el) el.textContent = getStr('s-appSubtitle', APP_SETTINGS.appSubtitle); }
  if (key === 'version') { var el = document.getElementById('app-version-badge'); if (el) el.textContent = getStr('s-version', APP_SETTINGS.version); }
  if (key === 'accentColor') { document.documentElement.style.setProperty('--blue-mid', getStr('s-accentColor', APP_SETTINGS.accentColor)); }
}

function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + (type || 'info') + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.className = 'toast'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════════
// AUTH SYSTEM (localStorage-based)
// ═══════════════════════════════════════════════════════════════════
function getUsers() { try { return JSON.parse(localStorage.getItem('tctp_users') || '[]'); } catch(e) { return []; } }
function saveUsers(u) { localStorage.setItem('tctp_users', JSON.stringify(u)); }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem('tctp_current_user') || 'null'); } catch(e) { return null; } }
function setCurrentUser(u) { localStorage.setItem('tctp_current_user', JSON.stringify(u)); }
function clearCurrentUser() { localStorage.removeItem('tctp_current_user'); }

function switchAuthTab(tab) {
  var tabs = document.querySelectorAll('.auth-tab');
  var forms = document.querySelectorAll('.auth-form');
  tabs[0].classList.remove('active'); tabs[1].classList.remove('active');
  forms[0].classList.remove('active'); forms[1].classList.remove('active');
  if (tab === 'login') { tabs[0].classList.add('active'); forms[0].classList.add('active'); }
  else { tabs[1].classList.add('active'); forms[1].classList.add('active'); }
  hideBanners(); clearFieldErrors();
}

function hideBanners() {
  var e = document.getElementById('auth-error'); if (e) { e.classList.remove('show'); e.textContent = ''; }
  var s = document.getElementById('auth-success'); if (s) { s.classList.remove('show'); s.textContent = ''; }
}

function showAuthError(msg) {
  hideBanners();
  var el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function showAuthSuccess(msg) {
  hideBanners();
  var el = document.getElementById('auth-success');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearFieldErrors() { document.querySelectorAll('.auth-field').forEach(function(f) { f.classList.remove('has-error'); }); }
function setFieldError(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('has-error'); var d = el.querySelector('.field-error'); if (d && msg) d.textContent = msg; }
}

function checkPasswordStrength(pw) {
  var fill = document.getElementById('pw-strength-fill');
  var text = document.getElementById('pw-strength-text');
  if (!fill || !text) return;
  var score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  var levels = [
    { w: '0%', c: 'var(--border)', t: '' },
    { w: '20%', c: 'var(--red)', t: 'Weak' },
    { w: '40%', c: 'var(--amber)', t: 'Fair' },
    { w: '60%', c: 'var(--amber)', t: 'Good' },
    { w: '80%', c: 'var(--green)', t: 'Strong' },
    { w: '100%', c: 'var(--green)', t: 'Very strong' },
  ];
  var l = levels[Math.min(score, 5)];
  fill.style.width = l.w; fill.style.background = l.c;
  text.textContent = l.t; text.style.color = l.c;
}

function handleLogin(e) {
  e.preventDefault(); clearFieldErrors(); hideBanners();
  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value;
  var valid = true;
  if (!username) { setFieldError('lf-username', 'Username is required'); valid = false; }
  if (!password) { setFieldError('lf-password', 'Password is required'); valid = false; }
  if (!valid) return;
  var users = getUsers();
  var user = null;
  for (var i = 0; i < users.length; i++) { if (users[i].username.toLowerCase() === username.toLowerCase()) { user = users[i]; break; } }
  if (!user) { showAuthError('No account found with that username. Please sign up first.'); return; }
  if (user.password !== btoa(password)) { showAuthError('Invalid password. Please try again.'); return; }
  setCurrentUser({ username: user.username, email: user.email, fullName: user.fullName });
  showAuthSuccess('Welcome back, ' + (user.fullName || user.username) + '!');
  setTimeout(enterApp, 600);
}

function handleSignup(e) {
  e.preventDefault(); clearFieldErrors(); hideBanners();
  var fullName = document.getElementById('signup-fullname').value.trim();
  var email = document.getElementById('signup-email').value.trim();
  var username = document.getElementById('signup-username').value.trim();
  var password = document.getElementById('signup-password').value;
  var confirm = document.getElementById('signup-confirm').value;
  var valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('sf-email', 'Please enter a valid email address'); valid = false; }
  if (!username || username.length < 3) { setFieldError('sf-username', 'Username must be at least 3 characters'); valid = false; }
  if (!password || password.length < 6) { setFieldError('sf-password', 'Password must be at least 6 characters'); valid = false; }
  if (password !== confirm) { setFieldError('sf-confirm', 'Passwords do not match'); valid = false; }
  if (!valid) return;
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username.toLowerCase() === username.toLowerCase()) { showAuthError('Username already exists. Please choose a different one.'); return; }
    if (users[i].email.toLowerCase() === email.toLowerCase()) { showAuthError('An account with that email already exists.'); return; }
  }
  var newUser = { username: username, email: email, fullName: fullName || username, password: btoa(password), createdAt: new Date().toISOString() };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser({ username: newUser.username, email: newUser.email, fullName: newUser.fullName });
  showAuthSuccess('Account created successfully! Welcome, ' + (newUser.fullName || newUser.username) + '!');
  setTimeout(enterApp, 600);
}

function enterApp() {
  document.getElementById('auth-overlay').classList.add('hidden');
  var user = getCurrentUser();
  if (user) updateUserDisplay(user);
}

function updateUserDisplay(user) {
  var initials = (user.fullName || user.username || '?').split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
  var av = document.getElementById('user-avatar'); if (av) av.textContent = initials;
  var nm = document.getElementById('ud-name'); if (nm) nm.textContent = user.fullName || user.username;
  var em = document.getElementById('ud-email'); if (em) em.textContent = user.email || '';
}

function handleLogout() {
  clearCurrentUser(); closeUserMenu();
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-password').value = '';
  document.getElementById('signup-confirm').value = '';
  document.getElementById('signup-fullname').value = '';
  switchAuthTab('login'); hideBanners();
}

function toggleUserMenu() { document.getElementById('user-dropdown').classList.toggle('open'); }
function closeUserMenu() { document.getElementById('user-dropdown').classList.remove('open'); }
document.addEventListener('click', function(e) {
  var c = document.getElementById('user-menu-container');
  if (c && !c.contains(e.target)) closeUserMenu();
});

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC OVERRIDES — make addRow, renderCashFlow, renderSensitivity,
// renderEVMTrend, and showPage use settings
// ═══════════════════════════════════════════════════════════════════

// Override addRow to use dynamic defaultPlannedHours
var __origAddRow = addRow;
addRow = function(cat, data) {
  data = data || {};
  if (data.plannedHours === undefined) data.plannedHours = (APP_SETTINGS.defaultPlannedHours || 160);
  __origAddRow(cat, data);
};

// Override renderCashFlow to use dynamic months
var __origCF = renderCashFlow;
renderCashFlow = function(d, c) {
  var el = document.getElementById('cf-chart');
  if (!el) return;
  var cfMonths = APP_SETTINGS.cashflowMonths || 24;
  var monthlyNet = d.monthlyNet;
  var cum = -d.totalOnetime;
  var maxAbs = Math.max(Math.abs(cum), Math.abs(monthlyNet) * cfMonths, 1);
  var html = '';
  for (var mo = 1; mo <= cfMonths; mo++) {
    cum += monthlyNet;
    var w = Math.min(Math.abs(cum) / maxAbs * 100, 100);
    var pos = cum >= 0;
    var col = pos ? 'var(--green)' : 'var(--red)';
    html += '<div class="cf-row"><div class="cf-mo">Mo ' + mo + '</div><div class="cf-track"><div class="cf-fill" style="width:' + w + '%;background:' + col + '"></div></div><div class="cf-val" style="color:' + col + '">' + fmt(c, cum) + '</div></div>';
  }
  el.innerHTML = html;
};

// Override renderSensitivity to use dynamic scenarios
var __origSens = renderSensitivity;
renderSensitivity = function(d, c) {
  var tbody = document.getElementById('sens-tbody');
  if (!tbody) return;
  var volBase = getNum('f-volBase', d.targetVol);
  var volOpt = getNum('f-volOpt', Math.round(d.targetVol * 1.6));
  var volPess = getNum('f-volPess', Math.round(d.targetVol * 0.4));
  var customScenarios = APP_SETTINGS.scenarios || DEFAULT_SETTINGS.scenarios;
  var scenarios = [
    { label: 'Base case', vol: volBase, costMult: 1, priceMult: 1 },
    { label: 'Optimistic volume', vol: volOpt, costMult: 1, priceMult: 1 },
    { label: 'Pessimistic volume', vol: volPess, costMult: 1, priceMult: 1 },
    { label: 'Cost overrun +' + Math.round(d.costBuffer*100) + '%', vol: volBase, costMult: 1+d.costBuffer, priceMult: 1 },
  ];
  for (var i = 0; i < customScenarios.length; i++) {
    scenarios.push({ label: customScenarios[i].label, vol: volBase, costMult: customScenarios[i].costMult, priceMult: customScenarios[i].priceMult });
  }
  var out = '';
  for (var si = 0; si < scenarios.length; si++) {
    var s = scenarios[si];
    var adjCost = d.totalProject * s.costMult;
    var adjPrice = d.sellingPrice * s.priceMult;
    var adjVar = d.totalPerunit;
    var cp = s.vol > 0 ? adjCost / s.vol + adjVar : Infinity;
    var beu = (adjPrice - adjVar) > 0 ? Math.ceil(adjCost / (adjPrice - adjVar)) : Infinity;
    var bev = isFinite(beu) ? beu * adjPrice : Infinity;
    var mRev = adjPrice * s.vol / Math.max(d.salesPeriod, 1);
    var mNet = mRev - d.totalMonthly * s.costMult;
    var pb = (mNet > 0 && d.totalOnetime * s.costMult > 0) ? Math.ceil((d.totalOnetime * s.costMult) / mNet) : Infinity;
    var roi = adjCost > 0 ? Math.round((adjPrice * s.vol - adjCost - adjVar * s.vol) / adjCost * 100) : 0;
    var beOk = isFinite(beu) && beu <= s.vol;
    var payOk = isFinite(pb) && pb > 0 && pb <= d.maxPayback;
    var roiOk = roi >= d.minROI;
    var gm = adjPrice > 0 ? (adjPrice - cp) / adjPrice * 100 : 0;
    var gmOk = gm >= d.minMarginPct;
    var score = [beOk, payOk, roiOk, gmOk].filter(Boolean).length;
    var vc = score === 4 ? 'go' : score >= 2 ? 'caution' : 'nogo';
    var vl = score === 4 ? 'Go' : score >= 2 ? 'Caution' : 'No-Go';
    out += '<tr style="background:' + (si%2?'var(--bg)':'') + '"><td style="font-weight:' + (si===0?700:400) + '">' + s.label + '</td><td class="r">' + (isFinite(beu)?beu.toLocaleString():'&#8734;') + '</td><td class="r">' + (isFinite(bev)?fmt(c,bev):'&#8734;') + '</td><td class="r" style="color:' + (roi>=0?'var(--green)':'var(--red)') + '">' + roi + '%</td><td class="r">' + (isFinite(pb)&&pb>0?pb+' mo':'&#8734;') + '</td><td><span class="verdict-pill vp-' + vc + '">' + vl + '</span></td></tr>';
  }
  tbody.innerHTML = out;
};

// Override renderEVMTrend to use dynamic chart width
var __origTrend = renderEVMTrend;
renderEVMTrend = function(d, evm, c) {
  var el = document.getElementById('evm-trend-chart');
  if (!el) return;
  var duration = evm.duration, stdHours = evm.stdHours;
  var cumPlanned = 0, cumActual = 0, points = [];
  for (var m = 1; m <= duration; m++) {
    var monthPlan = 0, monthActual = 0;
    rows.labour.forEach(function(row) {
      var qty = parseFloat(row.qty) || 1;
      var monthlyCost = getRowMonthlyCost(row);
      var plannedHrs = row.rateBasis === 'hourly' ? (parseFloat(row.plannedHours)||0) : stdHours;
      var impliedRate = plannedHrs > 0 ? monthlyCost / plannedHrs : 0;
      monthPlan += monthlyCost * qty;
      if (m <= evm.currentMonth) {
        var actualHrs = actualHours[row.id] && actualHours[row.id][m] !== undefined ? actualHours[row.id][m] : plannedHrs;
        monthActual += impliedRate * actualHrs * qty;
      }
    });
    cumPlanned += monthPlan;
    if (m <= evm.currentMonth) cumActual += monthActual;
    points.push({ m: m, planned: cumPlanned, actual: m <= evm.currentMonth ? cumActual : null });
  }
  var maxVal = Math.max.apply(null, points.map(function(p) { return p.planned; }).concat([cumActual, 1]));
  var w = APP_SETTINGS.evmChartWidth || 680, h = 220, padL = 50, padB = 24, padT = 10, padR = 10;
  var plotW = w - padL - padR, plotH = h - padT - padB;
  function xFor(m) { return padL + (m-1)/(duration-1||1) * plotW; }
  function yFor(v) { return padT + plotH - (v/maxVal) * plotH; }
  var plannedPath = points.map(function(p,i) { return (i===0?'M':'L') + ' ' + xFor(p.m) + ' ' + yFor(p.planned); }).join(' ');
  var actualPoints = points.filter(function(p) { return p.actual !== null; });
  var actualPath = actualPoints.map(function(p,i) { return (i===0?'M':'L') + ' ' + xFor(p.m) + ' ' + yFor(p.actual); }).join(' ');
  var currentX = xFor(evm.currentMonth);
  el.innerHTML = '<svg width="100%" viewBox="0 0 ' + w + ' ' + h + '" style="overflow:visible">' +
    '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (h-padB) + '" stroke="#dde4eb"/>' +
    '<line x1="' + padL + '" y1="' + (h-padB) + '" x2="' + (w-padR) + '" y2="' + (h-padB) + '" stroke="#dde4eb"/>' +
    '<text x="' + (padL-6) + '" y="' + (padT+4) + '" font-size="10" fill="#7a8fa0" text-anchor="end">' + fmt(c,maxVal) + '</text>' +
    '<text x="' + (padL-6) + '" y="' + (h-padB) + '" font-size="10" fill="#7a8fa0" text-anchor="end">0</text>' +
    '<line x1="' + currentX + '" y1="' + padT + '" x2="' + currentX + '" y2="' + (h-padB) + '" stroke="#1a6cf0" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>' +
    '<text x="' + currentX + '" y="' + (padT-2) + '" font-size="10" fill="#1a6cf0" text-anchor="middle">Now (M' + evm.currentMonth + ')</text>' +
    '<path d="' + plannedPath + '" fill="none" stroke="#7a8fa0" stroke-width="2" stroke-dasharray="5,4"/>' +
    '<path d="' + actualPath + '" fill="none" stroke="#1a6cf0" stroke-width="2.5"/>' +
    (actualPoints.length ? '<circle cx="' + xFor(actualPoints[actualPoints.length-1].m) + '" cy="' + yFor(actualPoints[actualPoints.length-1].actual) + '" r="4" fill="#1a6cf0"/>' : '') +
    '<text x="' + (w-padR) + '" y="' + (padT+12) + '" font-size="10" fill="#7a8fa0" text-anchor="end">M' + duration + '</text>' +
    '<text x="' + padL + '" y="' + (h-4) + '" font-size="10" fill="#7a8fa0">M1</text>' +
    '</svg><div style="display:flex;gap:18px;font-size:12px;margin-top:6px"><span style="color:#7a8fa0">- - Planned cumulative cost</span><span style="color:#1a6cf0">&#8212; Actual cumulative cost (to date)</span></div>';
};

// Override showPage to populate settings form on navigate
var __origShowPage = showPage;
showPage = function(id) {
  __origShowPage(id);
  if (id === 'settings') populateSettingsForm();
};

// ═══════════════════════════════════════════════════════════════════
// ENHANCED INIT
// ═══════════════════════════════════════════════════════════════════

"""

old_init = """// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
seedDefaults();
seedActualHours();
rebuildTrackingTable();
recalcAll();"""

new_init = """// ═══════════════════════════════════════════════════════
// INIT - Load settings, check auth, then seed data
// ═══════════════════════════════════════════════════════════════════
loadSettings();

// Check if user is already logged in
var existingUser = getCurrentUser();
if (existingUser) {
  document.getElementById('auth-overlay').classList.add('hidden');
  updateUserDisplay(existingUser);
}

seedDefaults();
seedActualHours();
rebuildTrackingTable();
recalcAll();"""

original = original.replace(old_init, new_js_block + new_init)

# ═══════════════════════════════════════════════════════════════════
# 8.  WRITE OUTPUT
# ═══════════════════════════════════════════════════════════════════
with open(DST, "w", encoding="utf-8") as f:
    f.write(original)

print(f"Written to {DST}")
print(f"Original: {len(original):,} chars")