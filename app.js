const STORAGE_KEY = 'cost-pilot-v0.1';

const SAMPLE_TEXT = '我平时主要在 Codex 里做运营和短视频：会调研抖音上的高质量内容、拆解用户痛点、写口播脚本和发布文案。今天还想做一个一人公司的成本测算器，根据客户的 AI 对话判断工作场景，再给模型、素材和推广成本方案。有时候做小工具，我觉得应该用好一点的模型来保证产品质量。';

const SCENARIOS = {
  content: { label: '运营与内容', short: '运营', color: 'cyan', keywords: ['短视频','口播','脚本','剪辑','抖音','分镜','拍摄','发布','文案','运营','素材','内容','选题'], hours: 3.4 },
  research: { label: '调研与判断', short: '调研', color: 'orange', keywords: ['调研','研究','搜索','评论','竞品','趋势','数据','成本','背调','对标','拆解','模型','方案'], hours: 2.2 },
  build: { label: '工具与产品', short: '构建', color: 'pink', keywords: ['小工具','工具','产品','原型','网页','网站','app','代码','开发','调试','测试','api','自动化','界面','功能'], hours: 4.8 },
  client: { label: '客户交付', short: '交付', color: 'lavender', keywords: ['客户','交付','报价','甲方','演示','提案','合同','需求','项目'], hours: 4.1 },
  admin: { label: '经营与后台', short: '后台', color: 'muted', keywords: ['记账','税','发票','合同','采购','预算','报销','注册','公司'], hours: 1.4 },
};

const DEFAULT_STATE = {
  models: {
    luna: { label: 'Luna', role: '日常生产', cost: 0.8, quality: 2.8 },
    core: { label: 'Core', role: '稳妥交付', cost: 2.6, quality: 3.8 },
    build: { label: 'Build', role: '构建产品', cost: 6.8, quality: 4.5 },
    review: { label: 'Review', role: '最终验收', cost: 4.5, quality: 4.8 },
  },
  settings: { workDays: 22, tasksPerDay: 6, assetCost: 300, promotionCost: 500, softwareCost: 300, hourlyValue: 180 },
  updates: [],
};

const MODEL_META = {
  luna: { name: 'Luna', role: '日常生产', color: 'cyan' },
  core: { name: 'Core', role: '稳妥交付', color: 'orange' },
  build: { name: 'Build', role: '构建产品', color: 'pink' },
  review: { name: 'Review', role: '最终验收', color: 'lavender' },
};

const PLAN_META = {
  lean: { title: '省钱生产', tagline: '先把日常产出跑起来', dot: 'lean', fit: '运营、整理、日常内容' },
  balanced: { title: '平衡交付', tagline: '便宜模型做大部分，关键节点升级', dot: 'balanced', fit: '客户交付、重要选题' },
  quality: { title: '构建质量', tagline: '把贵模型留给会影响结果的地方', dot: 'quality', fit: '小工具、产品、复杂决策' },
};

let state = loadState();
let currentAnalysis = analyze(SAMPLE_TEXT);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      models: { ...DEFAULT_STATE.models, ...(saved.models || {}) },
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      updates: Array.isArray(saved.updates) ? saved.updates : [],
    };
  } catch { return structuredClone(DEFAULT_STATE); }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(value) { return `¥${Math.round(value).toLocaleString('zh-CN')}`; }
function money2(value) { return `¥${Number(value).toFixed(2)}`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function analyze(text) {
  const normalized = String(text || '').toLowerCase();
  const scores = {};
  Object.entries(SCENARIOS).forEach(([key, scenario]) => {
    const hits = scenario.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
    scores[key] = { hits: hits.length, evidence: hits };
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1].hits - a[1].hits);
  const active = sorted.filter(([, value]) => value.hits > 0).slice(0, 4);
  if (!active.length) active.push(['content', { hits: 1, evidence: [] }]);
  const total = active.reduce((sum, [, value]) => sum + value.hits, 0);
  const weighted = active.map(([key, value]) => ({ key, ...value, share: Math.max(0.08, value.hits / total) }));
  const sum = weighted.reduce((totalShare, item) => totalShare + item.share, 0);
  weighted.forEach((item) => { item.share /= sum; });
  const primary = weighted[0].key;
  const hasBuild = Boolean(scores.build.hits);
  const hasContent = Boolean(scores.content.hits);
  const hasResearch = Boolean(scores.research.hits);
  const hasClient = Boolean(scores.client.hits);
  let mode = primary;
  let title = 'Luna 主力，关键一步再升级';
  let reason = '日常任务先用低成本模型跑完，只有会影响判断、交付或产品质量的节点才值得上更强模型。';
  if (hasBuild && (hasContent || hasResearch)) {
    mode = 'hybrid';
    title = 'Luna 主力 + Build 做架构和验收';
    reason = '你今天既在做运营和调研，又在构建小工具。让 Luna 负责整理、脚本和迭代，把 Build 留给架构、交互和交付前检查。';
  } else if (primary === 'build') {
    mode = 'build';
    title = 'Build 负责骨架，Luna 负责迭代';
    reason = '工具和产品的早期结构会影响后续返工，先用构建级模型把边界、架构和验收标准定稳，再把重复实现下沉给 Luna。';
  } else if (hasClient) {
    mode = 'client';
    title = 'Core 主力 + Review 做交付前检查';
    reason = '客户交付最贵的不是一次模型调用，而是返工和失去信任。日常材料可用 Luna，最终方案和对外文字用更稳的模型复核。';
  } else if (primary === 'research') {
    mode = 'research';
    title = 'Luna 做搜集，Core 做结论复核';
    reason = '调研阶段不需要每句话都用最强模型，但结论、引用和取舍会影响后续投入，建议把预算留给最后的判断。';
  }
  const confidence = Math.min(96, 68 + Math.min(25, total * 4) + (weighted.length > 1 ? 5 : 0));
  return { text, scores, weighted, primary, mode, title, reason, confidence, hasBuild, hasContent, hasResearch, hasClient };
}

function scenarioLabel(key) { return SCENARIOS[key]?.label || key; }

function mixFor(scenarioKey, planKey) {
  const mixes = {
    content: { lean: { luna: .92, core: .08 }, balanced: { luna: .72, core: .2, review: .08 }, quality: { luna: .48, core: .22, build: .16, review: .14 } },
    research: { lean: { luna: .8, core: .2 }, balanced: { luna: .55, core: .3, review: .15 }, quality: { luna: .35, core: .25, build: .12, review: .28 } },
    build: { lean: { luna: .54, core: .14, build: .24, review: .08 }, balanced: { luna: .34, core: .18, build: .32, review: .16 }, quality: { luna: .2, core: .18, build: .38, review: .24 } },
    client: { lean: { luna: .62, core: .28, review: .1 }, balanced: { luna: .4, core: .36, review: .24 }, quality: { luna: .2, core: .32, build: .12, review: .36 } },
    admin: { lean: { luna: .95, core: .05 }, balanced: { luna: .75, core: .25 }, quality: { luna: .55, core: .25, review: .2 } },
  };
  return mixes[scenarioKey]?.[planKey] || mixes.content[planKey];
}

function analysisScenarioMix(analysis, planKey) {
  const mix = {};
  analysis.weighted.forEach(({ key, share }) => {
    Object.entries(mixFor(key, planKey)).forEach(([model, part]) => { mix[model] = (mix[model] || 0) + share * part; });
  });
  return mix;
}

function aiCostFor(analysis, planKey, days = state.settings.workDays, tasks = state.settings.tasksPerDay) {
  const mix = analysisScenarioMix(analysis, planKey);
  const perTask = Object.entries(mix).reduce((sum, [model, ratio]) => sum + (state.models[model]?.cost || 0) * ratio, 0);
  return { mix, perTask, monthly: perTask * days * tasks, today: perTask * tasks };
}

function operationalCosts(analysis) {
  const s = state.settings;
  const workShare = analysis.weighted.reduce((sum, item) => sum + item.share * (SCENARIOS[item.key]?.hours || 2), 0);
  const timeCost = workShare * s.hourlyValue * s.workDays;
  const cashOps = s.assetCost + s.promotionCost + s.softwareCost;
  return { timeCost, cashOps, hoursPerDay: workShare };
}

function formatMix(mix) {
  return Object.entries(mix).filter(([, value]) => value > .04).sort((a, b) => b[1] - a[1]).map(([model, value]) => `<span class="mix-pill">${MODEL_META[model].name} ${Math.round(value * 100)}%</span>`).join('');
}

function renderRecommendation() {
  document.getElementById('confidence').textContent = `置信度 ${currentAnalysis.confidence}%`;
  document.getElementById('recommendationTitle').textContent = currentAnalysis.title;
  document.getElementById('recommendationReason').textContent = currentAnalysis.reason;
  document.getElementById('todayCost').textContent = money2(aiCostFor(currentAnalysis, recommendedPlan()).today);
  document.getElementById('scenarioSummary').textContent = currentAnalysis.weighted.map((item) => `${scenarioLabel(item.key)} ${Math.round(item.share * 100)}%`).join(' · ');
  document.getElementById('detectedScenarios').innerHTML = currentAnalysis.weighted.map((item, index) => `<span class="scenario-chip ${index === 0 ? 'primary' : ''}">${scenarioLabel(item.key)} · ${item.evidence.slice(0, 2).join('、') || '工作内容'}</span>`).join('');
}

function recommendedPlanFor(analysis) {
  if (analysis.mode === 'build') return 'quality';
  if (analysis.mode === 'client') return 'balanced';
  if (analysis.mode === 'hybrid') return 'balanced';
  return 'lean';
}

function recommendedPlan() { return recommendedPlanFor(currentAnalysis); }

function renderPlans() {
  const recommended = recommendedPlan();
  document.getElementById('planGrid').innerHTML = Object.entries(PLAN_META).map(([key, meta]) => {
    const ai = aiCostFor(currentAnalysis, key);
    const ops = operationalCosts(currentAnalysis);
    const cash = ai.monthly + ops.cashOps;
    const label = key === 'lean' ? '最低现金成本' : key === 'balanced' ? '较少返工' : '质量优先';
    return `<article class="plan-card ${key === recommended ? 'recommended' : ''}">
      <div class="plan-name-row"><span class="plan-dot ${meta.dot}"></span><h3>${meta.title}</h3></div>
      <p class="plan-tagline">${meta.tagline}</p>
      <div class="mix-row">${formatMix(ai.mix)}</div>
      <div class="plan-bottom"><div class="plan-cost"><span class="muted small">月现金成本 · ${label}</span><strong>${money(cash)}</strong></div><div class="plan-fit">适合：${meta.fit}</div></div>
    </article>`;
  }).join('');
}

function renderBreakdown() {
  const ai = aiCostFor(currentAnalysis, recommendedPlan());
  const ops = operationalCosts(currentAnalysis);
  const categories = [
    { label: 'AI 模型', value: ai.monthly, cls: 'ai' },
    { label: '素材 / 推广 / 软件', value: ops.cashOps, cls: 'ops' },
    { label: '你的时间', value: ops.timeCost, cls: 'time' },
  ];
  const max = Math.max(...categories.map((item) => item.value), 1);
  document.getElementById('monthlyCashCost').textContent = money(ai.monthly + ops.cashOps);
  document.getElementById('monthlyFullCost').textContent = money(ai.monthly + ops.cashOps + ops.timeCost);
  document.getElementById('barList').innerHTML = categories.map((item) => `<div class="bar-row"><span>${item.label}</span><div class="bar-track"><div class="bar-fill ${item.cls}" style="width:${Math.max(5, item.value / max * 100)}%"></div></div><span class="bar-value">${money(item.value)}</span></div>`).join('');
}

function aggregateProfile() {
  const counts = Object.fromEntries(Object.keys(SCENARIOS).map((key) => [key, 0]));
  state.updates.forEach((update, index) => {
    const recencyWeight = Math.max(0.35, 1 - index * 0.07);
    (update.scenarios || []).forEach((item) => { counts[item.key] = (counts[item.key] || 0) + item.share * recencyWeight; });
  });
  if (!state.updates.length) { counts.content = 4; counts.research = 2; counts.build = 1.4; }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, value]) => sum + value, 0) || 1;
  return { counts, sorted, total };
}

function renderProfile() {
  const { counts, sorted, total } = aggregateProfile();
  const [dominantKey, dominantValue] = sorted[0];
  const dominantPercent = Math.round(dominantValue / total * 100);
  const secondary = sorted.slice(1, 4).filter(([, value]) => value > 0);
  document.getElementById('dominantPercent').textContent = `${dominantPercent}%`;
  document.getElementById('dominantScenario').textContent = scenarioLabel(dominantKey);
  document.getElementById('profileDescription').textContent = dominantKey === 'content' ? '你更适合把便宜模型当成日常生产力，把高阶模型留给最终判断。' : dominantKey === 'build' ? '你的成本大头不是 token，而是返工。把强模型集中在架构、验收和关键决策。' : '你的工作在不断切换，模型路由比固定订阅更重要。';
  const angle = Math.min(360, dominantPercent * 3.6);
  document.getElementById('donut').style.background = `conic-gradient(var(--cyan) 0 ${angle}deg, rgba(255,255,255,0.1) ${angle}deg 260deg, var(--orange) 260deg 315deg, var(--pink) 315deg 360deg)`;
  document.getElementById('profileTags').innerHTML = secondary.map(([key, value]) => `<span class="profile-tag">${scenarioLabel(key)} ${Math.round(value / total * 100)}%</span>`).join('');
  const days = Array.from({ length: 7 }, (_, index) => state.updates[index] ? Math.min(3, Math.ceil((state.updates[index].scenarios?.[0]?.share || .25) * 4)) : 0).reverse();
  document.getElementById('historyStrip').innerHTML = days.map((level, index) => `<div class="history-day"><i class="${level ? `level-${level}` : ''}"></i><span>${['一','二','三','四','五','六','日'][index]}</span></div>`).join('');
}

function renderUpdates() {
  document.getElementById('updateCount').textContent = `已记录 ${state.updates.length} 次更新`;
  const list = document.getElementById('updatesList');
  if (!state.updates.length) {
    list.innerHTML = '<div class="empty-state">还没有保存过工作记录。把今天的 Codex 对话贴进上方，点击“分析并更新方案”即可开始积累你的真实工作画像。</div>';
    return;
  }
  list.innerHTML = state.updates.slice(0, 6).map((update) => `<div class="update-row"><div class="update-date">${escapeHtml(update.date)}</div><div class="update-content"><strong>${escapeHtml(update.title)}</strong><p>${escapeHtml(update.preview)}</p></div><div class="update-amount">${money2(update.todayCost)} / 次</div></div>`).join('');
}

function renderSettings() {
  document.getElementById('modelTable').innerHTML = Object.entries(state.models).map(([key, model]) => `<div class="model-row"><div><div class="model-name">${MODEL_META[key].name}</div><div class="model-role">${MODEL_META[key].role}</div></div><div class="model-score">能力 ${model.quality.toFixed(1)} / 5</div><label class="sr-only" for="model-cost-${key}">${model.label} 每次任务成本</label><input id="model-cost-${key}" type="number" min="0" step="0.1" value="${model.cost}" data-model="${key}" /><span class="muted small">/ 任务</span></div>`).join('');
  document.querySelectorAll('[data-setting]').forEach((input) => { input.value = state.settings[input.dataset.setting]; });
}

function renderAll() {
  renderRecommendation();
  renderPlans();
  renderBreakdown();
  renderProfile();
  renderUpdates();
  renderSettings();
}

function makeTitle(analysis) {
  const primary = scenarioLabel(analysis.primary);
  return analysis.mode === 'hybrid' ? '运营调研 + 小工具构建' : `${primary}工作更新`;
}

function commitUpdate(text) {
  if (!text.trim()) return;
  const analysis = analyze(text);
  const ai = aiCostFor(analysis, recommendedPlanFor(analysis));
  state.updates.unshift({
    date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    title: makeTitle(analysis),
    preview: text.trim().slice(0, 120),
    scenarios: analysis.weighted.map(({ key, share }) => ({ key, share })),
    todayCost: ai.today,
  });
  state.updates = state.updates.slice(0, 60);
  saveState();
  currentAnalysis = analysis;
  renderAll();
}

function bindEvents() {
  const input = document.getElementById('workInput');
  input.value = SAMPLE_TEXT;
  const updateCount = () => { document.getElementById('charCount').textContent = `${input.value.length} 字`; };
  input.addEventListener('input', updateCount);
  updateCount();
  document.getElementById('loadSample').addEventListener('click', () => { input.value = SAMPLE_TEXT; currentAnalysis = analyze(input.value); updateCount(); renderAll(); });
  document.getElementById('analyzeButton').addEventListener('click', () => commitUpdate(input.value));
  document.querySelectorAll('[data-target]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  document.getElementById('exportData').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cost-pilot-records.json'; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('clearData').addEventListener('click', () => {
    if (!confirm('确定清空当前设备上的工作记录和参数吗？')) return;
    state = structuredClone(DEFAULT_STATE); saveState(); currentAnalysis = analyze(input.value); renderAll();
  });
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-model]')) { state.models[target.dataset.model].cost = Number(target.value) || 0; saveState(); renderAll(); }
    if (target.matches('[data-setting]')) { state.settings[target.dataset.setting] = Number(target.value) || 0; saveState(); renderAll(); }
  });
}

bindEvents();
renderAll();
