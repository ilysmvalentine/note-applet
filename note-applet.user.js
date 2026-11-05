// ==UserScript==
// @name         Molly's Note Builder for SimplePractice
// @namespace    molly-note-builder
// @version      1.3.0
// @description  Preset-based clinical note builder with symptom assessment, interventions, homework, they/them wording, and six themes. No AI or saved drafts.
// @match        https://secure.simplepractice.com/*
// @run-at       document-idle
// @sandbox      DOM
// @grant        GM_registerMenuCommand
// @noframes
// @updateURL    https://raw.githubusercontent.com/ilysmvalentine/note-applet/main/note-applet.user.js
// @downloadURL  https://raw.githubusercontent.com/ilysmvalentine/note-applet/main/note-applet.user.js
// ==/UserScript==

/*
 * Molly's Note Builder 1.3.0 — single-file Tampermonkey edition.
 * No Xcode, bundler, API key, or server is needed to install this file.
 * Select actual findings and review the entire note before insertion.
 * No AI, external dependencies, runtime network calls, telemetry, or note storage.
 * Tampermonkey checks the fixed update URL separately from note processing.
 * Closing discards the in-memory draft. Text already inserted/copied remains
 * subject to the EHR's autosave and the system clipboard's behavior.
 * Clinical documentation aid; not a HIPAA or payer-compliance certification.
 * The only granted userscript API adds a menu command; no note is sent to it.
 */
(() => {
  'use strict';
  if (window.top !== window.self) return;
  const modules = Object.create(null);

// ---- catalog.js ----
/* Presets paraphrased from Molly's 14 supplied modality documents.
   Presets describe counselor actions only. Client responses are selected separately. */
(() => {
  'use strict';
  const option = (id, label, text = label) => ({ id, label, text });
  const modality = (id, label, items, primary = false) => ({ id, label, primary, items: items.map(([key, title, text]) => option(key, title, text)) });
  modules.MollyCatalog = {
    modalities: [
      modality('act', 'Acceptance and Commitment Therapy (ACT)', [
        ['defusion', 'Cognitive defusion', 'guided cognitive defusion to help the client notice thoughts without automatically acting on them'],
        ['values', 'Values clarification', 'supported clarification of values and their connection to current treatment goals'],
        ['acceptance', 'Acceptance and willingness', 'explored willingness to experience difficult internal states while pursuing valued activities'],
        ['committed', 'Committed action planning', 'collaboratively planned a manageable action aligned with the client’s stated values'],
        ['present', 'Present-moment awareness', 'guided present-moment awareness and nonjudgmental noticing'],
        ['avoidance', 'Examine experiential avoidance', 'examined how experiential avoidance affects symptoms and daily functioning']
      ], true),
      modality('cbt', 'Cognitive Behavioral Therapy (CBT)', [
        ['thoughts', 'Identify thought patterns', 'helped identify automatic thoughts and thinking patterns associated with distress'],
        ['socratic', 'Socratic questioning', 'used Socratic questioning to examine evidence and consider alternative perspectives'],
        ['reframe', 'Cognitive restructuring', 'practiced developing balanced alternatives to unhelpful appraisals'],
        ['record', 'Review a thought record', 'reviewed a thought record to examine links among thoughts, feelings, and behavior'],
        ['problem', 'Structured problem-solving', 'guided structured problem-solving and identification of manageable next steps'],
        ['rehearsal', 'Communication rehearsal', 'rehearsed assertive communication and boundary-setting strategies'],
        ['psychoeducation', 'Cognitive-behavioral psychoeducation', 'provided psychoeducation about interactions among thoughts, emotions, and behavior']
      ], true),
      modality('emdr', 'Eye Movement Desensitization and Reprocessing (EMDR)', [
        ['history', 'Phase 1 · History and planning', 'reviewed relevant history and treatment planning for EMDR'],
        ['preparation', 'Phase 2 · Preparation and resourcing', 'guided preparation, grounding, and resource development for EMDR'],
        ['assessment', 'Phase 3 · Target assessment', 'assessed an identified target, associated cognitions, distress, and bodily sensations'],
        ['desensitization', 'Phase 4 · Desensitization', 'facilitated EMDR desensitization using bilateral stimulation while monitoring tolerance'],
        ['installation', 'Phase 5 · Installation', 'facilitated installation of an adaptive cognition related to the identified target'],
        ['body', 'Phase 6 · Body scan', 'guided a body scan to assess residual activation'],
        ['closure', 'Phase 7 · Closure', 'used closure and stabilization strategies and reviewed between-session monitoring'],
        ['reevaluation', 'Phase 8 · Re-evaluation', 're-evaluated the prior target and current symptoms to inform further treatment']
      ], true),
      modality('mi', 'Motivational Interviewing (MI)', [
        ['oars', 'Open questions, affirmations, reflections, summaries', 'used open questions, affirmations, reflective listening, and summaries to explore motivation'],
        ['ambivalence', 'Explore ambivalence', 'explored ambivalence using reflections that acknowledged both change and sustain talk'],
        ['change', 'Elicit change talk', 'elicited the client’s own reasons, ability, and desire for change'],
        ['readiness', 'Readiness and confidence rulers', 'used readiness and confidence scaling to guide collaborative planning'],
        ['balance', 'Decisional balance', 'reviewed perceived benefits and costs of maintaining or changing current behavior'],
        ['autonomy', 'Autonomy and action planning', 'affirmed autonomy and collaborated on a next step consistent with readiness']
      ], true),
      modality('trauma', 'Trauma-informed therapy', [
        ['grounding', 'Grounding and stabilization', 'practiced grounding and stabilization strategies to address trauma-related activation'],
        ['education', 'Psychoeducation on trauma responses', 'provided psychoeducation about trauma responses and their effects on functioning'],
        ['window', 'Monitor arousal and pacing', 'monitored arousal and adjusted pacing collaboratively to support tolerable engagement'],
        ['choice', 'Safety, choice, and collaboration', 'supported choice and collaboration in setting session boundaries and priorities'],
        ['compassion', 'Self-compassion and trauma-related beliefs', 'explored trauma-related self-blame and practiced a more compassionate perspective'],
        ['coping', 'Present-focused coping', 'developed present-focused coping strategies for intrusive experiences and avoidance']
      ], true),
      modality('ba', 'Behavioral activation', [
        ['schedule', 'Meaningful activity scheduling', 'collaboratively scheduled manageable, meaningful activities'],
        ['barriers', 'Address barriers to activity', 'examined avoidance and problem-solved barriers to activity engagement'],
        ['mood', 'Activity and mood monitoring', 'reviewed links between activity patterns, mood, and functioning'],
        ['steps', 'Break tasks into steps', 'divided an overwhelming task into achievable steps matched to current capacity']
      ]),
      modality('dbt', 'Dialectical Behavior Therapy skills', [
        ['tolerance', 'Distress tolerance', 'taught and rehearsed distress-tolerance skills'],
        ['regulation', 'Emotion regulation', 'practiced identifying emotions and selecting regulation strategies'],
        ['interpersonal', 'Interpersonal effectiveness', 'rehearsed assertive requests and boundary-setting'],
        ['chain', 'Behavior chain analysis', 'examined a behavior chain to identify vulnerabilities and opportunities for skill use'],
        ['mindfulness', 'Mindfulness skills', 'guided nonjudgmental awareness of present experience']
      ]),
      modality('humanistic', 'Humanistic therapy', [
        ['strengths', 'Explore strengths and resources', 'supported recognition of personal strengths and coping resources'],
        ['meaning', 'Meaning and values exploration', 'facilitated exploration of meaning and personal values'],
        ['self', 'Self-awareness and compassion', 'supported reflective exploration and compassionate self-understanding']
      ]),
      modality('ipt', 'Interpersonal therapy', [
        ['patterns', 'Interpersonal patterns', 'examined communication and relationship patterns related to current symptoms'],
        ['transition', 'Role transitions', 'explored adjustment to role transitions and associated emotional responses'],
        ['communication', 'Communication practice', 'rehearsed communication strategies for an identified interpersonal difficulty'],
        ['support', 'Support and resources', 'reviewed available interpersonal supports and barriers to using them']
      ]),
      modality('mbct', 'Mindfulness-Based Cognitive Therapy', [
        ['decenter', 'Decentering from thoughts', 'guided noticing thoughts as mental events rather than facts'],
        ['breath', 'Mindful breathing', 'practiced mindful breathing and returning attention to present experience'],
        ['relapse', 'Recognize symptom patterns', 'explored early warning signs and mindful responses to recurring symptom patterns']
      ]),
      modality('mbsr', 'Mindfulness-Based Stress Reduction', [
        ['body', 'Body awareness', 'guided awareness of bodily sensations with nonjudgmental attention'],
        ['breath', 'Breathing and stress awareness', 'practiced mindful breathing and noticing stress responses'],
        ['practice', 'Daily mindfulness planning', 'collaboratively identified a feasible daily mindfulness practice']
      ]),
      modality('narrative', 'Narrative therapy', [
        ['externalize', 'Externalize the problem', 'used externalizing questions to examine the problem’s influence on functioning'],
        ['exceptions', 'Identify exceptions and strengths', 'explored exceptions to problem-focused narratives and identified strengths'],
        ['context', 'Explore social context', 'examined contextual influences on distress without attributing pathology to identity'],
        ['preferred', 'Develop preferred narratives', 'supported development of a preferred narrative connected to values and treatment goals']
      ]),
      modality('person', 'Person-centered therapy', [
        ['empathy', 'Empathic reflection', 'used empathic reflection to support emotional expression and self-understanding'],
        ['regard', 'Unconditional positive regard', 'offered nonjudgmental acceptance to support exploration of current concerns'],
        ['autonomy', 'Client-led exploration', 'supported client-led exploration and autonomous goal setting'],
        ['reflect', 'Reflect content and feeling', 'reflected content and feeling to support clarification of the client’s experience']
      ]),
      modality('sfbt', 'Solution-Focused Brief Therapy', [
        ['scaling', 'Scaling questions', 'used scaling questions to assess perceived progress and confidence'],
        ['exceptions', 'Exception finding', 'explored times when symptoms were less disruptive and identified helpful conditions'],
        ['future', 'Preferred future', 'elicited a preferred future to clarify meaningful treatment goals'],
        ['steps', 'Small achievable steps', 'collaborated on small, feasible steps drawing on existing strengths']
      ])
    ],
    symptoms: ['anxiety or excessive worry', 'low mood', 'rumination', 'intrusive memories', 'hyperarousal', 'avoidance', 'emotional dysregulation', 'sleep disturbance', 'difficulty concentrating', 'dissociative experiences', 'irritability', 'reduced motivation', 'fatigue', 'interpersonal distress'],
    functions: ['daily routines', 'self-care', 'sleep and rest', 'attention and task completion', 'relationships and communication', 'work or educational functioning', 'participation in valued activities', 'emotion regulation'],
    goals: ['increase use of coping skills', 'reduce anxiety-related interference', 'improve mood and engagement in daily activities', 'increase tolerance of trauma-related distress', 'improve emotional regulation', 'strengthen communication and boundaries', 'increase psychological flexibility', 'support adjustment to current stressors', 'maintain treatment gains'],
    responses: [
      option('engaged', 'Engaged · explored and practiced', 'engaged in exploration and practiced the selected skills'),
      option('insight', 'Identified patterns and alternatives', 'identified relevant patterns and considered alternative responses'),
      option('prompting', 'Participated with prompting', 'participated with prompting and required additional support to apply the intervention'),
      option('mixed', 'Mixed response', 'showed a mixed response, with both engagement and difficulty applying the intervention'),
      option('limited', 'Limited observable response', 'showed limited observable response to the intervention during this session'),
      option('distress', 'Distress increased · intervention adjusted', 'experienced increased distress, and the counselor adjusted pacing and intervention'),
      option('declined', 'Declined the proposed intervention', 'declined the proposed intervention after discussion of available options')
    ],
    progress: [
      option('met', 'Goal met', 'The client met the treatment-plan goal addressed in this session'),
      option('moderate', 'Moderate Progress', 'The client demonstrated moderate progress toward this goal'),
      option('maintained', 'Maintained prior gains', 'The client maintained previously established gains related to this goal'),
      option('unchanged', 'No meaningful change', 'There was no meaningful change toward this goal during the interval assessed'),
      option('worsened', 'Increased difficulty', 'The client experienced increased difficulty related to this goal'),
      option('early', 'Early treatment · baseline being established', 'A baseline related to this goal is being established')
    ],
    participation: [
      option('active', 'Expressed concerns and engaged with questions', 'The client participated by expressing current concerns and engaging with the counselor’s questions and reflections.'),
      option('supported', 'Participated with additional support', 'The client participated with additional prompts, reflection, and support from the counselor.'),
      option('variable', 'Participation varied', 'The client’s participation varied across the session, and the counselor adapted the approach to support engagement.'),
      option('limited', 'Participation was limited', 'The client’s participation was limited during this session.')
    ],
    homework: [
      option('grounding', 'Grounding practice', 'practice the grounding strategy reviewed in session'),
      option('defusion', 'Cognitive defusion practice', 'practice noticing and labeling thoughts using the defusion strategy reviewed in session'),
      option('thought', 'Thought record', 'complete a brief thought record and practice developing a balanced alternative'),
      option('values', 'Values-aligned action', 'take the agreed manageable step toward a personally meaningful activity'),
      option('activity', 'Activity and mood monitoring', 'track participation in the agreed activity and note related mood changes'),
      option('communication', 'Communication practice', 'practice the communication or boundary-setting skill rehearsed in session'),
      option('mindfulness', 'Mindfulness practice', 'practice the brief mindfulness exercise reviewed in session'),
      option('coping', 'Coping effectiveness review', 'notice when they use the selected coping strategy and review its effectiveness'),
      option('resource', 'EMDR resource practice', 'practice the stabilization resource reviewed in session and note between-session responses')
    ],
    takeaways: ['they can pause and choose a coping response', 'they can notice thoughts without treating them as facts', 'small steps can support movement toward their goals', 'they can practice expressing needs and boundaries', 'they can use grounding to support present-moment awareness'],
    followups: ['symptom patterns and functional impact', 'use and effectiveness of the agreed coping strategies', 'barriers to between-session practice', 'progress toward the treatment-plan goal', 'response to EMDR work and readiness for the next phase', 'communication practice and its effects on functioning']
  };
})();

// ---- core.js ----
(() => {
  'use strict';
  const C = modules.MollyCatalog;
  const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  const sentence = value => clean(value).replace(/[.!?]+$/, '') + '.';
  const list = values => values.length < 2 ? (values[0] || '') : values.length === 2 ? values.join(' and ') : values.slice(0, -1).join(', ') + ', and ' + values.at(-1);
  const find = (items, id) => items.find(x => x.id === id);
  function blankGoal() { return { goal: '', customGoal: '', modality: '', interventions: [], customIntervention: '', response: '', evidence: '', progress: '', progressEvidence: '', emdrDetails: '' }; }
  function initial() { return { symptoms: [], customSymptoms: '', source: '', severity: '', frequency: '', trend: '', functions: [], functionalDetail: '', necessity: '', goals: [blankGoal()], participation: '', takeaways: [], customTakeaway: '', homework: [], homeworkStatus: '', homeworkDetail: '', homeworkSchedule: '', followups: [], customFollowup: '', frequencyPlan: '', reviewed: false, manualOverride: false }; }
  const goalText = g => g.goal === 'custom' ? clean(g.customGoal) : clean(g.goal);
  function validate(d) {
    const errors = [];
    const add = (step, field, message) => errors.push({ step, field, message });
    if (!d.symptoms.length && !clean(d.customSymptoms)) add(0, 'symptoms', 'Select symptoms or enter an accurate symptom assessment.');
    for (const [key, label] of [['source','assessment source'], ['severity','symptom severity'], ['frequency','symptom frequency'], ['trend','change in symptoms']]) if (!d[key]) add(0, key, 'Select ' + label + '.');
    if (!d.functions.length && !clean(d.functionalDetail)) add(0, 'functions', 'Document current functional impact, or explain functioning in the detail field.');
    if (!clean(d.necessity)) add(0, 'necessity', 'Document the clinical reason for the current treatment plan.');
    d.goals.forEach((g, i) => {
      const n = 'Goal ' + (i + 1) + ': ';
      if (!goalText(g)) add(1, 'goals', n + 'select or enter a treatment-plan goal.');
      const m = find(C.modalities, g.modality);
      if (!m) add(1, 'goals', n + 'select a modality used.');
      if (!(m && g.interventions.some(id => find(m.items, id))) && !clean(g.customIntervention)) add(1, 'goals', n + 'select an intervention actually used.');
      if (!find(C.responses, g.response)) add(1, 'goals', n + 'select the client’s response.');
      if (!clean(g.evidence)) add(1, 'goals', n + 'add a brief, observable example of their response.');
      if (!find(C.progress, g.progress)) add(1, 'goals', n + 'select progress toward this goal.');
      if (!clean(g.progressEvidence)) add(1, 'goals', n + 'briefly support the progress assessment.');
      if (g.modality === 'emdr' && !clean(g.emdrDetails)) add(1, 'goals', n + 'document phase-specific findings and closure/stability as applicable.');
    });
    if (!find(C.participation, d.participation)) add(2, 'participation', 'Select observed participation.');
    if (!d.takeaways.length && !clean(d.customTakeaway)) add(2, 'takeaways', 'Select or enter the client’s takeaways, or accurately state that none were identified.');
    if (!['agreed','modified','declined','notAssigned'].includes(d.homeworkStatus)) add(2, 'homeworkStatus', 'Document the between-session plan status.');
    if (['agreed','modified'].includes(d.homeworkStatus) && !d.homework.some(id => find(C.homework, id)) && !clean(d.homeworkDetail)) add(2, 'homework', 'Select or enter the between-session practice.');
    if (['agreed','modified'].includes(d.homeworkStatus) && !clean(d.homeworkSchedule)) add(2, 'homeworkSchedule', 'Specify the agreed practice frequency or timeframe.');
    if (['declined','notAssigned'].includes(d.homeworkStatus) && !clean(d.homeworkDetail)) add(2, 'homeworkDetail', 'Briefly document the rationale and any alternative plan.');
    if (!d.followups.length && !clean(d.customFollowup)) add(2, 'followups', 'Select or enter counselor follow-up.');
    if (!clean(d.frequencyPlan)) add(2, 'frequencyPlan', 'Document the follow-up timeframe or treatment frequency plan.');
    return errors;
  }
  function assemble(d) {
    const paragraphs = [];
    const descriptions = d.goals.map(g => find(C.modalities, g.modality)?.label).filter(Boolean);
    if (descriptions.length) paragraphs.push('The counselor used ' + sentence(list([...new Set(descriptions)])));
    const sx = [...d.symptoms, clean(d.customSymptoms)].filter(Boolean);
    const symptomParts = [];
    if (sx.length) {
      const source = { report: 'Based on the client’s report', observation: 'Based on the counselor’s observations', both: 'Based on client report and counselor observation', measure: 'Based on a reviewed symptom measure and clinical assessment' }[d.source] || 'Symptom assessment';
      symptomParts.push(sentence(source + ', symptoms assessed included ' + list(sx)));
    }
    if (d.severity) symptomParts.push('Current severity was assessed as ' + d.severity + '.');
    if (d.frequency) symptomParts.push('Frequency: ' + sentence(d.frequency));
    if (d.trend) symptomParts.push('Compared with the prior assessment, symptoms were ' + d.trend + '.');
    if (symptomParts.length) paragraphs.push(symptomParts.join(' '));
    if (d.functions.length || clean(d.functionalDetail)) paragraphs.push((d.functions.length ? 'Symptoms affected ' + list(d.functions) + '.' : '') + (clean(d.functionalDetail) ? ' ' + sentence(d.functionalDetail) : ''));
    if (clean(d.necessity)) paragraphs.push('Clinical rationale for the current treatment plan: ' + sentence(d.necessity));
    d.goals.forEach(g => {
      const m = find(C.modalities, g.modality);
      const actions = m ? g.interventions.map(id => find(m.items, id)?.text).filter(Boolean) : [];
      if (clean(g.customIntervention)) actions.push(clean(g.customIntervention));
      const pieces = [];
      if (m && actions.length) pieces.push('Using ' + m.label + ', the counselor ' + sentence(list(actions)));
      if (g.modality === 'emdr' && clean(g.emdrDetails)) pieces.push('EMDR findings: ' + sentence(g.emdrDetails));
      const response = find(C.responses, g.response);
      if (response) pieces.push('The client ' + sentence(response.text) + (clean(g.evidence) ? ' Evidence: ' + sentence(g.evidence) : ''));
      else if (clean(g.evidence)) pieces.push('Client response observations: ' + sentence(g.evidence));
      const progress = find(C.progress, g.progress);
      if (progress) pieces.push(sentence(progress.text) + (clean(g.progressEvidence) ? ' ' + sentence(g.progressEvidence) : ''));
      else if (clean(g.progressEvidence)) pieces.push('Progress assessment: ' + sentence(g.progressEvidence));
      if (pieces.length) paragraphs.push(pieces.join(' '));
    });
    const participation = find(C.participation, d.participation);
    if (participation) paragraphs.push(participation.text);
    const takeaways = [...d.takeaways, clean(d.customTakeaway)].filter(Boolean);
    if (takeaways.length) paragraphs.push('The client’s stated takeaways: ' + sentence(list(takeaways)));
    const homework = d.homework.map(id => find(C.homework, id)?.text).filter(Boolean);
    if (clean(d.homeworkDetail)) homework.push(clean(d.homeworkDetail));
    if (['agreed','modified'].includes(d.homeworkStatus) && homework.length) paragraphs.push('Between sessions, the client ' + (d.homeworkStatus === 'modified' ? 'agreed to the modified plan to ' : 'agreed to ') + sentence(list(homework)) + (clean(d.homeworkSchedule) ? ' Agreed timeframe: ' + sentence(d.homeworkSchedule) : ''));
    if (d.homeworkStatus === 'declined') paragraphs.push('The client declined between-session practice.' + (clean(d.homeworkDetail) ? ' Rationale and alternative plan: ' + sentence(d.homeworkDetail) : ''));
    if (d.homeworkStatus === 'notAssigned') paragraphs.push('No between-session practice was assigned.' + (clean(d.homeworkDetail) ? ' Rationale and alternative plan: ' + sentence(d.homeworkDetail) : ''));
    if (!d.homeworkStatus && homework.length) paragraphs.push('Between-session plan: ' + sentence(list(homework)) + (clean(d.homeworkSchedule) ? ' Timeframe: ' + sentence(d.homeworkSchedule) : ''));
    const followups = [...d.followups, clean(d.customFollowup)].filter(Boolean);
    if (followups.length) paragraphs.push('The counselor will follow up with the client regarding ' + sentence(list(followups)) + (clean(d.frequencyPlan) ? ' Follow-up plan: ' + sentence(d.frequencyPlan) : ''));
    else if (clean(d.frequencyPlan)) paragraphs.push('Follow-up plan: ' + sentence(d.frequencyPlan));
    return paragraphs.join('\n\n');
  }
  function snippetRange(value) {
    const starts = ['The counselor used', 'The client responded', 'The client participated', 'The client stated that their takeaway', 'Between sessions, the client will practice/review', 'The counselor will follow up'];
    let cursor = 0;
    const positions = [];
    for (const anchor of starts) {
      const position = value.indexOf(anchor, cursor);
      if (position < 0 || (position > 0 && value[position - 1] !== '\n')) return null;
      positions.push(position); cursor = position + anchor.length;
    }
    const end = value.indexOf('\n', positions.at(-1));
    return { start: positions[0], end: end < 0 ? value.length : end };
  }
  function merge(original, narrative, mode) {
    if (mode === 'snippet') {
      const range = snippetRange(original);
      if (!range) throw new Error('The General snippet could not be identified safely. Choose append or paste manually.');
      return original.slice(0, range.start) + narrative + original.slice(range.end);
    }
    return original.trimEnd() + (original.trim() ? '\n\n' : '') + narrative;
  }
  function canComplete(d) { return Boolean(d.reviewed && (d.manualOverride || !validate(d).length) && assemble(d).trim()); }
  modules.MollyCore = { initial, blankGoal, validate, assemble, snippetRange, merge, clean, canComplete };
})();

// ---- themes.js ----
/* Color roles taken from the user's Wanderlog Tools v1.4.0 palettes.
   Only this page's in-memory theme selection is retained. No storage APIs. */
(() => {
  'use strict';
  modules.MollyThemes = [
    { id: 'light', label: 'Light', bg: '#ffffff', fg: '#202124', border: '#d6d1c8', title: '#202124', muted: '#5f6368', primary: '#2f6f4e', hover: '#285f43', onPrimary: '#ffffff', soft: '#f8f9fa', selected: '#edf0f2', paper: '#ffffff' },
    { id: 'dark', label: 'Dark', bg: '#22211f', fg: '#f3eadb', border: '#6f6454', title: '#fff7e8', muted: '#cbbda6', primary: '#6f8f66', hover: '#7da375', onPrimary: '#11110f', soft: '#34312d', selected: '#403b35', paper: '#171615' },
    { id: 'terracotta', label: 'Terracotta', bg: '#f2dfcf', fg: '#342018', border: '#b46b4b', title: '#5b2e1f', muted: '#8d5b43', primary: '#9f5136', hover: '#89442d', onPrimary: '#fff7ef', soft: '#fff3ea', selected: '#ead0bd', paper: '#fff3ea' },
    { id: 'forest', label: 'Forest', bg: '#e8efe3', fg: '#1d2a1e', border: '#78936c', title: '#203c25', muted: '#56715a', primary: '#2f5d3a', hover: '#254d30', onPrimary: '#f7fff3', soft: '#f7fff3', selected: '#dbe9d5', paper: '#f7fff3' },
    { id: 'lavender', label: 'Lavender', bg: '#f0eafa', fg: '#2b2338', border: '#a894c7', title: '#3d2f58', muted: '#6e5d88', primary: '#6d5798', hover: '#5f4b88', onPrimary: '#fffaff', soft: '#fffaff', selected: '#e5dbf3', paper: '#fffaff' },
    { id: 'water', label: 'Water', bg: '#e5f2f0', fg: '#16302f', border: '#77aaa6', title: '#174c4c', muted: '#4d7573', primary: '#257b7b', hover: '#1f6d6d', onPrimary: '#f1fffd', soft: '#f5fffd', selected: '#d4ebe8', paper: '#f5fffd' }
  ];
})();

// ---- ui.js ----
(() => {
  'use strict';
  const C = modules.MollyCatalog, Core = modules.MollyCore, themes = modules.MollyThemes;
  let themeIndex = themes.findIndex(t => t.id === 'lavender');
  const css = `
    :host{all:initial;color-scheme:light}*{box-sizing:border-box}dialog{padding:0;border:1px solid #dcd8e7;border-radius:18px;background:#fcfbf8;color:#242a31;width:min(1140px,96vw);max-width:none;height:min(850px,94dvh);max-height:94dvh;box-shadow:0 28px 100px #17272a44;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
    dialog::backdrop{background:#152c3d88;backdrop-filter:blur(3px)}button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #bca6df;outline-offset:2px}button:disabled{opacity:.5;cursor:not-allowed}h1,h2,h3,p{margin:0}h1{font-size:20px;letter-spacing:-.5px}h2{font-size:21px;letter-spacing:-.4px;margin-bottom:6px}h3{font-size:16px;margin-bottom:10px}small,.hint{color:#5b6670;font-size:12px}.hint{display:block;margin:4px 0 10px}.shell{height:100%;display:flex;flex-direction:column}header{display:flex;align-items:center;gap:12px;padding:20px 25px 16px;background:white;border-bottom:1px solid #e4e4e1}.mark{display:grid;place-items:center;background:#e8e1f0;color:#5f477e;width:42px;height:42px;border-radius:13px;font-size:25px}.subtitle{font-size:12px;color:#5b6670}.local{margin-left:auto;font-size:11px;font-weight:650;color:#296b62;background:#eaf4ef;padding:5px 10px;border-radius:20px;white-space:nowrap}.icon{border:0;background:transparent;border-radius:6px;font-size:24px;line-height:1;padding:6px;color:#555}.workspace{min-height:0;flex:1;display:grid;grid-template-columns:1.12fr 1fr}.left{display:flex;min-height:0;flex-direction:column;border-right:1px solid #e2e3de}nav{padding:15px 18px 12px;display:flex;gap:5px;background:#f7f6f2}.step{border:0;border-radius:7px;background:transparent;color:#57616a;padding:9px 6px;font-size:12px;flex:1;white-space:nowrap}.step[aria-current=step]{background:#e8e1f0;color:#4c366b;font-weight:700}.form{padding:20px 26px 28px;overflow:auto;flex:1}.intro{color:#5b6670;margin-bottom:20px;font-size:13px}.field{margin:16px 0}.field>label,.field>legend{display:block;font-weight:650;margin-bottom:7px;font-size:13px}fieldset{padding:0;border:0;min-width:0}input[type=text],select,textarea{display:block;width:100%;border:1px solid #c9ced0;border-radius:8px;background:#fff;padding:10px 11px;color:#283039;font-size:13px}textarea{resize:vertical;min-height:72px}input[type=checkbox]{accent-color:#73568f;width:16px;height:16px;flex-shrink:0;margin:2px 0}.checks{display:grid;grid-template-columns:1fr 1fr;gap:7px}.check{display:flex;align-items:flex-start;gap:8px;font-size:12px;padding:8px 9px;border:1px solid #dfe1dd;border-radius:7px;background:#fff}.check:has(input:checked){border-color:#9a83b2;background:#f1edf5}.checks.single{grid-template-columns:1fr}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.goal{padding:15px;margin:16px 0;border:1px solid #d6d2df;border-radius:12px;background:#f8f6fa}.goalhead{display:flex;justify-content:space-between;align-items:center}.goalhead h3{margin:0}.secondary,.primary{border-radius:8px;padding:10px 15px;font-weight:650;font-size:12px}.secondary{background:#fff;color:#514268;border:1px solid #c8bed5}.primary{background:#6c5188;color:white;border:1px solid #6c5188}.textbutton{border:0;background:transparent;color:#6c5188;font-size:12px;padding:4px}.preview{display:flex;flex-direction:column;min-height:0;background:#f4f5f0;padding:22px}.previewhead{display:flex;align-items:center;justify-content:space-between;gap:12px}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.4px;color:#68746a;text-transform:uppercase}.preview h2{font-size:17px;margin-top:3px}.count{font-size:11px;color:#5b6670}.paper{margin-top:14px;flex:1;min-height:0;width:100%;resize:none;background:#fff;border:1px solid #e0e2da;border-radius:10px;padding:22px;font:13px/1.8 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#374044}.preview .hint{margin:12px 0 0}.bottom{padding:14px 24px;display:flex;align-items:center;gap:10px;border-top:1px solid #e0e1dc;background:#fff}.bottom .spacer{flex:1}.status{font-size:12px;color:#5b6670;max-width:52%}.error{color:#983c32;background:#fdf0ec;padding:10px 12px;border-radius:8px;margin:12px 0;font-size:12px}.error ul{padding-left:18px;margin:5px 0}.complete{color:#286158}.reviewline{display:flex;gap:9px;align-items:flex-start;background:#efebf4;padding:12px;border-radius:8px;font-size:12px;margin:16px 0}.badge{font-size:11px;color:#5b6670}.notice{font-size:12px;color:#5b6670;margin:14px 0}.hide{display:none!important}@media(max-width:800px){.workspace{grid-template-columns:1fr}.preview{display:none}dialog{width:96vw}.form{padding:18px}header{padding:14px}.local{display:none}.bottom{padding:12px}.step{font-size:11px}.checks{grid-template-columns:1fr}.status{max-width:45%;font-size:11px}.preview.mobile{display:flex;height:400px;flex-shrink:0}.workspace.reviewing{overflow:auto}.workspace.reviewing .left{min-height:460px}.workspace.reviewing .form{overflow:visible}}@media(prefers-reduced-motion:no-preference){dialog{animation:appear .15s ease-out}@keyframes appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}
  `;
  const themeCss = `
    dialog,.workspace,.form,.paper{overscroll-behavior:contain}.form,.workspace,.paper{-webkit-overflow-scrolling:touch}.form{scrollbar-gutter:stable}.multiselect{border:1px solid var(--border);border-radius:8px;background:var(--paper)}.multiselect summary{padding:10px 11px;cursor:pointer;font-size:13px;color:var(--fg)}.multiselect .field{padding:0 10px 10px;margin:0;max-height:260px;overflow:auto;overscroll-behavior:contain}.multiselect .field>legend{padding-top:8px}.control-label{display:block;font-weight:650;font-size:13px;margin-bottom:7px}.override{margin-top:10px}.override:has(input:disabled){opacity:.6}
    @media(max-width:800px){.workspace.reviewing{display:block}.workspace.reviewing .left{display:block;min-height:0}.workspace.reviewing .form{overflow:visible}.workspace.reviewing .preview{height:450px}}
    dialog{background:var(--bg);color:var(--fg);border-color:var(--border);color-scheme:var(--scheme)}h1,h2,h3{color:var(--title)}header,.bottom{background:var(--soft);border-color:var(--border)}.left{border-color:var(--border)}nav,.preview,.goal{background:var(--bg)}.goal,.paper{border-color:var(--border)}.subtitle,small,.hint,.intro,.status,.count,.notice,.badge,.eyebrow{color:var(--muted)}.mark,.reviewline,.step[aria-current=step]{background:var(--selected);color:var(--title)}.step,.icon{color:var(--muted)}.step:hover,.icon:hover{background:var(--selected)}.check,input[type=text],select,textarea,.secondary,.paper{background:var(--paper);color:var(--fg);border-color:var(--border)}.check:has(input:checked){background:var(--selected);border-color:var(--primary)}input[type=checkbox]{accent-color:var(--primary)}.primary{background:var(--primary);color:var(--onPrimary);border-color:var(--primary)}.primary:hover{background:var(--hover)}.secondary,.textbutton{color:var(--title)}.secondary:hover{background:var(--selected)}.local{background:var(--selected);color:var(--title)}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline-color:var(--primary)}.error{background:var(--errorBg);color:var(--errorFg)}.error .textbutton{color:var(--errorFg)}.complete{color:var(--success)}.theme-button{font-size:17px;width:31px;height:31px;padding:4px;flex-shrink:0}
  `;
  function mount(root, options = {}) {
    let data = Core.initial(), step = 0, disposed = false, expiry;
    const opener = document.activeElement;
    const el = (tag, attrs = {}, text) => {
      const node = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v);
      }
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const style = el('style', {}, css + themeCss), dialog = el('dialog', { 'aria-labelledby': 'molly-title' });
    const shell = el('div', { class: 'shell' }); dialog.append(shell);
    // Freeze the host page while the modal is open. Preserve its existing inline
    // styles and visual position, including Safari's rubber-band scroll behavior.
    let pageLock = null;
    function lockPage() {
      if (pageLock) return;
      const body = document.body, html = document.documentElement;
      const properties = [[body, ['position','top','left','width','overflow']], [html, ['overflow','overscroll-behavior','scroll-behavior']]];
      pageLock = { x: window.scrollX, y: window.scrollY, styles: properties.flatMap(([node, keys]) => keys.map(key => [node, key, node.style.getPropertyValue(key), node.style.getPropertyPriority(key)])) };
      body.style.setProperty('position', 'fixed', 'important'); body.style.setProperty('top', -pageLock.y + 'px', 'important'); body.style.setProperty('left', -pageLock.x + 'px', 'important'); body.style.setProperty('width', '100%', 'important'); body.style.setProperty('overflow', 'hidden', 'important');
      html.style.setProperty('overflow', 'hidden', 'important'); html.style.setProperty('overscroll-behavior', 'none', 'important'); html.style.setProperty('scroll-behavior', 'auto', 'important');
    }
    function unlockPage() {
      if (!pageLock) return;
      const saved = pageLock; pageLock = null;
      for (const [node, key, value, priority] of saved.styles) if (key !== 'scroll-behavior') { if (value) node.style.setProperty(key, value, priority); else node.style.removeProperty(key); }
      window.scrollTo(saved.x, saved.y);
      const [node, key, value, priority] = saved.styles.find(([, key]) => key === 'scroll-behavior');
      if (value) node.style.setProperty(key, value, priority); else node.style.removeProperty(key);
    }
    function canScroll(event, delta, horizontal = false) {
      if (!delta) return true;
      for (const node of event.composedPath()) {
        if (node === dialog) break;
        if (!(node instanceof Element)) continue;
        const overflow = getComputedStyle(node)[horizontal ? 'overflowX' : 'overflowY'];
        if (!/(auto|scroll)/.test(overflow)) continue;
        const pos = node[horizontal ? 'scrollLeft' : 'scrollTop'];
        const max = node[horizontal ? 'scrollWidth' : 'scrollHeight'] - node[horizontal ? 'clientWidth' : 'clientHeight'];
        if (max > 1 && (delta < 0 ? pos > 0 : pos < max - 1)) return true;
      }
      return false;
    }
    dialog.addEventListener('wheel', e => { e.stopPropagation(); if (!e.ctrlKey && !canScroll(e, Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, Math.abs(e.deltaX) > Math.abs(e.deltaY))) e.preventDefault(); }, { passive: false });
    let touchPoint = null;
    dialog.addEventListener('touchstart', e => { touchPoint = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
    dialog.addEventListener('touchmove', e => {
      e.stopPropagation();
      if (!touchPoint || e.touches.length !== 1) return;
      const point = e.touches[0], dx = touchPoint.x - point.clientX, dy = touchPoint.y - point.clientY;
      if (!canScroll(e, Math.abs(dx) > Math.abs(dy) ? dx : dy, Math.abs(dx) > Math.abs(dy))) e.preventDefault();
      touchPoint = { x: point.clientX, y: point.clientY };
    }, { passive: false });
    let adoptedSheet = null;
    try {
      // Constructed sheets avoid depending on the host page allowing inline <style>.
      const sheet = new CSSStyleSheet(); sheet.replaceSync(css + themeCss);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]; adoptedSheet = sheet; root.append(dialog);
    } catch { root.append(style, dialog); }
    const header = el('header');
    const title = el('div'); title.append(el('h1', { id: 'molly-title' }, 'Molly’s Note Builder'), el('p', { class: 'subtitle' }, 'A little structure. Room for your clinical judgment.'));
    const themeButton = el('button', { class: 'icon theme-button', type: 'button', onclick: () => { themeIndex = (themeIndex + 1) % themes.length; applyTheme(); status.textContent = themes[themeIndex].label + ' theme'; } }, '🖌️');
    function applyTheme() {
      const theme = themes[themeIndex];
      for (const [key, value] of Object.entries(theme)) if (!['id','label'].includes(key)) dialog.style.setProperty('--' + key, value);
      const dark = theme.id === 'dark';
      for (const [key, value] of Object.entries({ scheme: dark ? 'dark' : 'light', errorBg: dark ? '#442d29' : '#fdf0ec', errorFg: dark ? '#ffc5ba' : '#8b3028', success: dark ? '#b1d4a6' : '#286158' })) dialog.style.setProperty('--' + key, value);
      dialog.dataset.theme = theme.id;
      const label = 'Theme: ' + theme.label + '. Switch to ' + themes[(themeIndex + 1) % themes.length].label;
      themeButton.setAttribute('aria-label', label); themeButton.title = label;
    }
    applyTheme();
    header.append(el('div', { class: 'mark', 'aria-hidden': 'true' }, '✎'), title, el('span', { class: 'local' }, 'On this device · No AI'), themeButton, el('button', { class: 'icon', type: 'button', 'aria-label': 'Close and discard draft', onclick: () => close() }, '×'));
    const workspace = el('div', { class: 'workspace' }), left = el('div', { class: 'left' }), nav = el('nav', { 'aria-label': 'Note sections' }), form = el('div', { class: 'form' });
    left.append(nav, form);
    const preview = el('section', { class: 'preview', 'aria-label': 'Note preview' }), previewhead = el('div', { class: 'previewhead' }), previewtitle = el('div');
    previewtitle.append(el('div', { class: 'eyebrow' }, 'Your note, assembled'), el('h2', {}, 'Clinical actions & methods'));
    const count = el('span', { class: 'count' }); previewhead.append(previewtitle, count);
    const paper = el('textarea', { class: 'paper', readonly: '', 'aria-label': 'Assembled note preview', placeholder: 'Your selections will appear here. No clinical findings are selected for you.' });
    preview.append(previewhead, paper, el('p', { class: 'hint' }, 'Preset language uses they/them. Include clinically relevant details; leave out unnecessary identifiers.'));
    workspace.append(left, preview);
    const bottom = el('footer', { class: 'bottom' }), status = el('span', { class: 'status', role: 'status', 'aria-live': 'polite' }), back = el('button', { class: 'secondary', type: 'button', onclick: () => go(step - 1) }, 'Back'), next = el('button', { class: 'primary', type: 'button', onclick: () => go(step + 1) }, 'Continue');
    bottom.append(status, el('span', { class: 'spacer' }), back, next); shell.append(header, workspace, bottom);
    let reviewedInput, overrideInput, copyButton, insertButton, errorsBox, insertionMode;
    const get = (obj, key) => obj[key];
    function touch() { if (disposed) return; data.reviewed = false; data.manualOverride = false; update(); clearTimeout(expiry); expiry = setTimeout(() => close(), 15 * 60 * 1000); }
    function field(label, node, hint) { const wrap = el('div', { class: 'field' }); const id = 'molly-field-' + (++mount.id); node.id = id; wrap.append(el('label', { for: id }, label), node); if (hint) wrap.append(el('small', { class: 'hint' }, hint)); return wrap; }
    function textField(obj, key, label, hint, multi = false) {
      const node = el(multi ? 'textarea' : 'input', { ...(multi ? { rows: '2' } : { type: 'text' }), maxlength: '2000', autocomplete: 'off', spellcheck: 'true', oninput: e => { obj[key] = e.target.value; touch(); } }); node.value = get(obj, key) || '';
      return field(label, node, hint);
    }
    function selectField(obj, key, label, values, hint, rerender = false) {
      const node = el('select', { onchange: e => { obj[key] = e.target.value; touch(); if (rerender) render(); } });
      node.append(el('option', { value: '' }, 'Choose…'));
      values.forEach(v => { const val = typeof v === 'string' ? v : v.id; node.append(el('option', { value: val }, typeof v === 'string' ? v : v.label)); }); node.value = get(obj, key) || '';
      return field(label, node, hint);
    }
    function checks(obj, key, label, values, single = false) {
      const wrap = el('fieldset', { class: 'field' }); wrap.append(el('legend', {}, label)); const choices = el('div', { class: 'checks' + (single ? ' single' : '') });
      values.forEach(v => { const id = typeof v === 'string' ? v : v.id; const label = el('label', { class: 'check' }); const node = el('input', { type: 'checkbox', value: id, onchange: e => { obj[key] = e.target.checked ? [...obj[key], id] : obj[key].filter(x => x !== id); touch(); } }); node.checked = obj[key].includes(id); label.append(node, el('span', {}, typeof v === 'string' ? v : v.label)); choices.append(label); }); wrap.append(choices); return wrap;
    }
    function multiSelect(obj, key, label, values, hint) {
      const wrap = el('div', { class: 'field' }), details = el('details', { class: 'multiselect', 'data-selection': key }), summary = el('summary', { 'aria-label': label });
      const summaryText = () => { summary.textContent = obj[key].length ? obj[key].length + ' selected' : 'Choose one or more…'; };
      summaryText(); details.append(summary, checks(obj, key, label, values, true)); details.addEventListener('change', summaryText);
      wrap.append(el('span', { class: 'control-label' }, label), details); if (hint) wrap.append(el('small', { class: 'hint' }, hint)); return wrap;
    }
    function titleSection(title, detail) { form.append(el('h2', { tabindex: '-1' }, title), el('p', { class: 'intro' }, detail)); }
    function symptoms() {
      titleSection('Assess symptoms & functioning', 'Use today’s assessment. Add only what is relevant to the treatment plan.');
      form.append(checks(data, 'symptoms', 'Symptoms assessed', C.symptoms), textField(data, 'customSymptoms', 'Other symptoms or assessment detail', 'For minimal or absent symptoms, describe the current assessment accurately. Include measure findings here if used.', true));
      form.append(selectField(data, 'source', 'Assessment source', [{ id: 'report', label: 'Client report' }, { id: 'observation', label: 'Counselor observation' }, { id: 'both', label: 'Client report and observation' }, { id: 'measure', label: 'Symptom measure and clinical assessment' }]));
      const row = el('div', { class: 'row' }); row.append(selectField(data, 'severity', 'Current severity', ['minimal or absent', 'mild', 'moderate', 'severe', 'variable']), selectField(data, 'frequency', 'Frequency', ['intermittent', 'several days during the assessed interval', 'most days during the assessed interval', 'daily', 'not currently present', 'variable during the assessed interval']));
      form.append(row, selectField(data, 'trend', 'Change since prior assessment', ['improved', 'unchanged', 'worsened', 'mixed across symptom areas', 'not comparable; this is an initial assessment']), checks(data, 'functions', 'Areas of functional impact', C.functions), textField(data, 'functionalDetail', 'Functional detail or preserved functioning', 'Briefly describe how symptoms affect an activity or ability, without unnecessary personal context.', true), textField(data, 'necessity', 'Clinical rationale for the current treatment plan', 'Connect assessed symptoms or relapse risk, functional needs, and the skilled care provided. Document discharge or change in plan when appropriate.', true));
    }
    function goals() {
      titleSection('Connect goals to clinical actions', 'Add one entry for each treatment-plan goal addressed. Select only interventions actually used.');
      data.goals.forEach((g, i) => {
        const section = el('section', { class: 'goal', 'aria-label': 'Treatment goal ' + (i + 1) }), head = el('div', { class: 'goalhead' }); head.append(el('h3', {}, 'Goal ' + (i + 1)));
        if (data.goals.length > 1) head.append(el('button', { type: 'button', class: 'textbutton', onclick: () => { data.goals.splice(i, 1); touch(); render(); } }, 'Remove goal'));
        section.append(head, selectField(g, 'goal', 'Treatment-plan goal addressed', [...C.goals, { id: 'custom', label: 'Enter a specific treatment-plan goal…' }], 'For organizing your selections only; this goal text is not added to the narrative.', true));
        if (g.goal === 'custom') section.append(textField(g, 'customGoal', 'Specific goal', 'Use a clinical or de-identified description.'));
        const mselect = el('select', { onchange: e => { g.modality = e.target.value; g.interventions = []; g.customIntervention = ''; g.emdrDetails = ''; touch(); render(); } });
        mselect.append(el('option', { value: '' }, 'Choose…'));
        for (const primary of [true, false]) { const group = el('optgroup', { label: primary ? 'Molly’s main approaches' : 'Other supplied approaches · use within your training' }); C.modalities.filter(m => m.primary === primary).forEach(m => group.append(el('option', { value: m.id }, m.label))); mselect.append(group); }
        mselect.append(el('option', { value: 'erp', disabled: '' }, 'ERP · not enabled (training pending)')); mselect.value = g.modality;
        section.append(field('Treatment modality used', mselect));
        const modality = C.modalities.find(m => m.id === g.modality);
        if (modality) section.append(checks(g, 'interventions', 'Interventions used', modality.items, true), textField(g, 'customIntervention', 'Additional or individualized intervention', 'Complete the phrase “the counselor…” with an action actually performed.', true));
        if (g.modality === 'emdr') section.append(textField(g, 'emdrDetails', 'EMDR phase-specific findings', 'Record relevant assessment or response (for example SUD/VOC if used), target status, tolerance, and closure/stability as applicable. The trauma narrative is not required here.', true));
        section.append(selectField(g, 'response', 'Client response to these interventions', C.responses), textField(g, 'evidence', 'Brief evidence of their response', 'For example: identified a thought pattern and rehearsed an alternative. Describe observed or reported evidence, not assumed improvement.', true), selectField(g, 'progress', 'Progress toward this goal', C.progress), textField(g, 'progressEvidence', 'Basis for the progress assessment', 'Connect a specific change, maintained ability, barrier, or baseline to this goal.', true)); form.append(section);
      });
      if (data.goals.length < 6) form.append(el('button', { class: 'secondary', type: 'button', onclick: () => { data.goals.push(Core.blankGoal()); touch(); render(); } }, '+ Add another goal / modality'));
    }
    function plan() {
      titleSection('Response & between-session plan', 'Document what was discussed and agreed. No practice assignment or positive response is assumed.');
      form.append(selectField(data, 'participation', 'Observed participation', C.participation), multiSelect(data, 'takeaways', 'Client’s stated takeaways', C.takeaways, 'Select all that the client actually expressed.'), textField(data, 'customTakeaway', 'Additional takeaway or accurate explanation', 'Add your own wording, or state accurately if no takeaway was identified.'));
      form.append(selectField(data, 'homeworkStatus', 'Between-session plan status', [{ id: 'agreed', label: 'Practice agreed' }, { id: 'modified', label: 'Practice modified to meet current needs' }, { id: 'declined', label: 'Practice declined · document alternative' }, { id: 'notAssigned', label: 'Practice not assigned · document rationale' }], undefined, true));
      if (['agreed','modified'].includes(data.homeworkStatus)) form.append(checks(data, 'homework', 'Practice / review agreed', C.homework, true));
      form.append(textField(data, 'homeworkDetail', ['declined','notAssigned'].includes(data.homeworkStatus) ? 'Rationale and alternative plan' : 'Individualized practice or additional detail', 'Use a concrete, achievable plan appropriate to the session.', true));
      if (['agreed','modified'].includes(data.homeworkStatus)) form.append(textField(data, 'homeworkSchedule', 'Agreed frequency or timeframe', 'For example: once daily until the next session, as agreed.'));
      form.append(multiSelect(data, 'followups', 'Counselor follow-up', C.followups, 'Select all follow-up areas that apply.'), textField(data, 'customFollowup', 'Additional follow-up focus'));
      form.append(textField(data, 'frequencyPlan', 'Follow-up timeframe / treatment frequency plan', 'For example: review at the next scheduled session; continue the current frequency if clinically appropriate.'));
    }
    function review() {
      titleSection('Review before adding', 'Read the full preview and confirm that it accurately reflects this session.');
      errorsBox = el('div'); form.append(errorsBox);
      form.append(el('p', { class: 'notice' }, 'Verify the existing note’s date, client, service location, CPT and time/duration, attendees, diagnosis, risk assessment, treatment plan, relevant mental status findings, and signature. This builder fills only the clinical narrative.'));
      if (options.onInsert) {
        const modeSelect = el('select', { onchange: e => { insertionMode = e.target.value; touch(); } });
        modeSelect.append(el('option', { value: 'append' }, 'Append to the clinical field'));
        if (options.hasSnippet) modeSelect.append(el('option', { value: 'snippet' }, 'Replace the General snippet narrative'));
        insertionMode ||= options.hasSnippet ? 'snippet' : 'append'; modeSelect.value = insertionMode;
        form.append(field('Where to place the text', modeSelect, 'Replacing the General narrative preserves the opening session goal and text after the follow-up paragraph. Review before insertion.'));
      }
      const attestation = el('label', { class: 'reviewline' }); reviewedInput = el('input', { type: 'checkbox', onchange: e => { data.reviewed = e.target.checked; if (!data.reviewed) data.manualOverride = false; update(); } }); reviewedInput.checked = data.reviewed;
      attestation.append(reviewedInput, el('span', {}, 'I reviewed the preview. These findings, interventions, responses, and plans accurately reflect this session.')); form.append(attestation);
      const override = el('label', { class: 'reviewline override' }); overrideInput = el('input', { type: 'checkbox', onchange: e => { data.manualOverride = data.reviewed && e.target.checked; update(); } });
      override.append(overrideInput, el('span', {}, 'Manual Override — allow copying or adding this reviewed note with blank fields.')); form.append(override);
      copyButton = el('button', { class: 'secondary', type: 'button', onclick: copy }, 'Copy reviewed note'); form.append(copyButton);
      form.append(el('p', { class: 'notice' }, 'Copying puts this text on the system clipboard. Clipboard history or syncing may retain it. Close clears the builder draft; anything already copied or inserted remains outside the builder.'));
      form.append(el('p', { class: 'notice' }, 'Requirements vary by payer and jurisdiction. This is a documentation aid, not a coverage or compliance guarantee. Keep clinically relevant information accurate, even when using less personal wording.'));
      if (options.demo) form.append(el('p', { class: 'notice' }, 'Demo only: use fictional information. The mock editor is not connected to SimplePractice.'));
    }
    function update() {
      const note = Core.assemble(data), errors = Core.validate(data); paper.value = note; count.textContent = note ? note.split(/\s+/).length + ' words' : 'Draft';
      if (reviewedInput) reviewedInput.checked = data.reviewed;
      if (overrideInput) { overrideInput.disabled = !data.reviewed; overrideInput.checked = data.manualOverride; }
      status.textContent = data.manualOverride ? (note.trim() ? 'Manual Override · blank fields allowed' : 'Enter some note content before copying or adding') : errors.length ? errors.length + ' item' + (errors.length === 1 ? '' : 's') + ' to complete' : 'Ready for clinical review';
      if (step === 3 && errorsBox) {
        errorsBox.replaceChildren();
        if (errors.length) { const box = el('details', { class: 'error' }); box.open = !data.manualOverride; box.append(el('summary', {}, data.manualOverride ? 'Blank fields left by choice (' + errors.length + ')' : 'Complete these items or use Manual Override')); const ul = el('ul'); errors.forEach(e => { const li = el('li'), b = el('button', { type: 'button', class: 'textbutton', onclick: () => go(e.step) }, e.message); li.append(b); ul.append(li); }); box.append(ul); errorsBox.append(box); }
        else errorsBox.append(el('p', { class: 'complete' }, 'Symptoms, goals, interventions, response, progress, and plan are complete.'));
      }
      if (copyButton) copyButton.disabled = !Core.canComplete(data);
      if (insertButton) insertButton.disabled = !Core.canComplete(data);
    }
    async function copy() {
      if (!Core.canComplete(data)) return;
      try { await navigator.clipboard.writeText(Core.assemble(data)); status.textContent = 'Copied to the system clipboard.'; }
      catch { paper.focus(); paper.select(); status.textContent = 'Copy was blocked. Select the preview text and press Command-C.'; preview.classList.add('mobile'); }
    }
    function render() {
      const formTop = form.scrollTop, workspaceTop = workspace.scrollTop;
      reviewedInput = null; overrideInput = null; copyButton = null; insertButton = null; errorsBox = null; form.replaceChildren(); nav.replaceChildren();
      ['1 Symptoms', '2 Goals & methods', '3 Response & plan', '4 Review'].forEach((label, i) => nav.append(el('button', { type: 'button', class: 'step', ...(step === i ? { 'aria-current': 'step' } : {}), onclick: () => go(i) }, label)));
      [symptoms, goals, plan, review][step]();
      workspace.classList.toggle('reviewing', step === 3); preview.classList.toggle('mobile', step === 3); back.disabled = step === 0;
      next.classList.toggle('hide', step === 3); bottom.querySelector('[data-insert]')?.remove();
      if (step === 3 && options.onInsert) {
        insertButton = el('button', { class: 'primary', type: 'button', 'data-insert': '', onclick: async () => {
          if (!Core.canComplete(data)) return;
          // A modal dialog makes the underlying rich editor inert. Release it before
          // invoking the editor's native editing path; reopen with the draft on error.
          dialog.close(); unlockPage();
          try { await options.onInsert(Core.assemble(data), insertionMode); close(true); }
          catch (e) { if (!disposed) { lockPage(); dialog.showModal(); status.textContent = e.message || 'Insertion failed. Copy and paste the reviewed note manually.'; } }
        } }, 'Add to clinical field'); bottom.append(insertButton);
      }
      update(); form.scrollTop = formTop; workspace.scrollTop = workspaceTop;
    }
    function go(n) { step = Math.max(0, Math.min(3, n)); render(); form.scrollTop = 0; workspace.scrollTop = 0; form.querySelector('h2')?.focus({ preventScroll: true }); }
    function close(inserted = false) {
      if (disposed) return; disposed = true; clearTimeout(expiry); data = null; paper.value = ''; dialog.close(); unlockPage(); dialog.remove(); style.remove(); if (adoptedSheet) root.adoptedStyleSheets = root.adoptedStyleSheets.filter(s => s !== adoptedSheet); options.onClose?.(inserted); if (!inserted && opener?.isConnected) opener.focus({ preventScroll: true });
    }
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    render(); lockPage(); dialog.showModal(); touch(); nav.querySelector('button')?.focus({ preventScroll: true });
    return { close };
  }
  mount.id = 0;
  modules.MollyUI = { mount };
})();

// ---- adapter.js ----
/* SimplePractice DOM adapter. No application API, client database, or network access. */
(() => {
  'use strict';
  const Core = modules.MollyCore;
  const selector = 'textarea,[contenteditable="true"]';
  const normalize = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const matchesLabel = s => normalize(s) === 'clinical actions intervention and methods' || normalize(s) === 'clinical actions interventions and methods';
  function labelsFor(field) {
    const texts = [field.getAttribute('aria-label')];
    for (const label of field.labels || []) texts.push(label.textContent);
    for (const id of (field.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)) texts.push(field.ownerDocument.getElementById(id)?.textContent);
    let parent = field.parentElement;
    for (let i = 0; parent && i < 4 && !['BODY','FORM','MAIN'].includes(parent.tagName); i++, parent = parent.parentElement) {
      if (parent.querySelectorAll(selector).length !== 1) break;
      for (const label of parent.querySelectorAll('label,legend,[data-field-label],.question-title,.field-label')) {
        if (label.textContent.length < 160) texts.push(label.textContent);
      }
      const labelledby = parent.getAttribute('aria-labelledby');
      if (labelledby) for (const id of labelledby.split(/\s+/)) texts.push(parent.ownerDocument.getElementById(id)?.textContent);
    }
    return texts.filter(Boolean);
  }
  function isTarget(field) {
    if (!field?.matches?.(selector) || field.disabled || field.readOnly || field.closest('[inert],[aria-hidden="true"]')) return false;
    return field.getClientRects().length > 0 && labelsFor(field).some(matchesLabel);
  }
  function targets(root = document) { return [...root.querySelectorAll(selector)].filter(isTarget); }
  function read(field) { return field.tagName === 'TEXTAREA' ? field.value : field.innerText; }
  function write(field, value) {
    if (field.tagName === 'TEXTAREA') {
      const nativeSet = Object.getOwnPropertyDescriptor(field.ownerDocument.defaultView.HTMLTextAreaElement.prototype, 'value').set;
      nativeSet.call(field, value);
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: null }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Use the editor's native editing path to notify rich-editor state and retain undo support.
      // Never replace innerHTML, execute pasted markup, or mutate editor internals.
      const doc = field.ownerDocument, selection = doc.getSelection(), range = doc.createRange();
      field.focus(); range.selectNodeContents(field); selection.removeAllRanges(); selection.addRange(range);
      if (!doc.execCommand('insertText', false, value)) throw new Error('This rich editor did not accept insertion. Copy the reviewed preview and paste it into the clinical field.');
    }
    field.focus();
  }
  function capture(field) {
    if (!isTarget(field)) throw new Error('Click inside the editable “Clinical Actions, Intervention, and Methods” field, then open the builder.');
    const original = read(field), path = location.pathname + location.search + location.hash;
    return {
      hasSnippet: Boolean(Core.snippetRange(original)),
      insert(note, mode) {
        if (!field.isConnected || location.pathname + location.search + location.hash !== path || !isTarget(field)) throw new Error('The note or clinical field changed. Close the builder and reopen it in the intended note.');
        if (read(field) !== original) throw new Error('The clinical field changed while the builder was open. Copy the preview or reopen the builder before inserting.');
        const combined = Core.merge(original, note, mode);
        write(field, combined);
        // Rich editors may represent paragraph spacing with different whitespace.
        // Compare the complete text while tolerating those formatting differences.
        const comparable = text => text.replace(/\s+/g, ' ').trim();
        if (comparable(read(field)) !== comparable(combined)) throw new Error('The editor changed the inserted text. Review the clinical field before continuing; do not insert a second time.');
      }
    };
  }
  function placement(field) {
    let parent = field.parentElement;
    for (let i = 0; parent && i < 4 && !['BODY','MAIN','FORM'].includes(parent.tagName); i++, parent = parent.parentElement) {
      if (parent.querySelectorAll(selector).length !== 1) break;
      const controls = [...parent.querySelectorAll('button,[role="button"]')].filter(n => !n.hasAttribute('data-molly-launch'));
      const snippet = controls.find(n => /snippet/i.test([n.getAttribute('aria-label'), n.getAttribute('title'), n.getAttribute('data-tooltip'), n.getAttribute('data-test-id'), n.getAttribute('data-testid'), n.textContent.length < 45 ? n.textContent : ''].join(' ')));
      if (snippet) return { parent: snippet.parentElement, before: snippet.nextSibling };
    }
    return { parent: field.parentElement, before: field };
  }
  modules.MollyAdapter = { targets, isTarget, capture, placement };
})();

// ---- celebration.js ----
/* Optional success feedback. This module never receives or reads note contents. */
(() => {
  'use strict';
  const messages = [
    "You're killing it!! 😘",
    "Great job! ⭐️",
    "Nice! 🥳",
    "Excellent 😎",
    "NOICE 🙌",
    "She's hot AND she's a great therapist?! 😍",
    "PASSED ✅",
    "One step closer to free time! Keep going!! ✨",
    "You're doing amazing! 💖",
    "Beautiful notes, beautiful therapist 💅",
    "YOU GO GIRL!! 🫶",
    "Bravo!! 👏👏",
    "Go Molly!! 💕",
    "You got this baby 😘",
    "Lookin' good! 👍✨",
    "SESSION CLEARED 🙌",
    "SHE DID IT 🤩",
    "Best therapist ever!! 🏆💋"
  ];
  const colors = ['#a88bd1', '#ef91ba', '#f4c75c', '#6ec8b8', '#8ebbea', '#d8b7ec'];
  const holdDuration = 2500, fadeDuration = 350;
  let active = null, previous = -1;
  const css = `
    :host{all:initial;pointer-events:none!important}
    .stage{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;background:transparent;overflow:hidden;pointer-events:none!important;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .stage::backdrop{background:transparent;pointer-events:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
    .message{position:absolute;left:50%;top:50%;z-index:2;width:max-content;max-width:min(680px,calc(100vw - 36px));margin:0;padding:0;border:0;background:transparent;text-align:center;font-size:clamp(26px,4.2vw,36px);font-weight:650;line-height:1.4;text-wrap:balance;overflow-wrap:break-word;color:var(--celebration-ink);opacity:0;transform:translate(-50%,-50%) scale(.94);transition:opacity 350ms ease,transform 350ms ease;pointer-events:none}
    .visible .message{opacity:1;transform:translate(-50%,-50%) scale(1);animation:note-applet-pop 480ms cubic-bezier(.2,.85,.25,1) both}
    @keyframes note-applet-pop{0%{transform:translate(-50%,-50%) scale(.78) rotate(-2deg)}65%{transform:translate(-50%,-50%) scale(1.035) rotate(.4deg)}100%{transform:translate(-50%,-50%) scale(1) rotate(0)}}
    @media(prefers-reduced-motion:reduce){.message{transition:none}.visible .message{animation:none}}
  `;
  function clear() { active?.dispose(); }
  function inkForPage() {
    // Inspect surface colors only, never text or other record information.
    for (const node of [document.body, document.documentElement]) {
      const match = getComputedStyle(node).backgroundColor.match(/^rgba?\(([^)]+)\)$/);
      if (!match) continue;
      const channels = match[1].split(',').map(Number);
      if (channels.length > 3 && channels[3] < .95) continue;
      const luminance = channels.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
      return .2126 * luminance[0] + .7152 * luminance[1] + .0722 * luminance[2] < .3 ? '#faf1ff' : '#392d4a';
    }
    return '#392d4a';
  }
  function show() {
    clear();
    const host = document.createElement('div'); host.setAttribute('data-note-applet-celebration', '');
    host.style.cssText = 'position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
    const abortSetup = () => { host.remove(); if (active?.dispose === abortSetup) active = null; };
    active = { dispose: abortSetup };
    const root = host.attachShadow({ mode: 'closed' }), stage = document.createElement('div'); stage.className = 'stage';
    stage.style.setProperty('--celebration-ink', inkForPage());
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    const message = document.createElement('p'); message.className = 'message'; message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); message.setAttribute('aria-atomic', 'true');
    stage.append(canvas, message); root.append(stage);
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(css); root.adoptedStyleSheets = [sheet]; }
    catch { const style = document.createElement('style'); style.textContent = css; root.prepend(style); }
    document.documentElement.append(host);
    // A manual popover can appear above EHR dialogs without making the page inert
    // or moving focus. Unsupported engines use the fixed, pointer-transparent host.
    if (typeof stage.showPopover === 'function') {
      stage.setAttribute('popover', 'manual');
      try { stage.showPopover(); } catch { stage.removeAttribute('popover'); }
    }
    const context = canvas.getContext('2d'), reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, particles = [], frame = 0, fadeTimer = 0, resetTimer = 0, alive = true;
    function resize() {
      const oldWidth = width, oldHeight = height;
      width = window.innerWidth; height = window.innerHeight;
      if (!context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (oldWidth && oldHeight) particles.forEach(p => { p.x *= width / oldWidth; p.y *= height / oldHeight; });
    }
    function dispose() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(frame); clearTimeout(fadeTimer); clearTimeout(resetTimer); particles = [];
      window.removeEventListener('resize', resize); window.removeEventListener('pagehide', dispose); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('keydown', keydown);
      if (stage.hasAttribute('popover')) { try { stage.hidePopover(); } catch {} }
      message.textContent = ''; host.remove(); if (active?.dispose === dispose) active = null;
    }
    function visibility() { if (document.hidden) dispose(); }
    function keydown(e) { if (e.key === 'Escape') dispose(); }
    function burst() {
      if (!context || reducedMotion.matches) return;
      const count = width < 500 ? 115 : 170;
      particles = Array.from({ length: count }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        return { x: width / 2 + side * Math.min(width * .15, 100), y: height / 2 + 16, vx: side * (1 + Math.random() * 5.5), vy: -5.5 - Math.random() * 9.5, gravity: .18 + Math.random() * .09, drag: .985 + Math.random() * .009, rotation: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * .22, sway: Math.random() * Math.PI * 2, size: 5 + Math.random() * 5, color: colors[i % colors.length], round: i % 7 === 0 };
      });
      const started = performance.now(); let lastTime = started;
      function draw(now) {
        if (!alive) return;
        const age = now - started, dt = Math.min((now - lastTime) / (1000 / 60), 2); lastTime = now; context.clearRect(0, 0, width, height);
        const opacity = Math.max(0, Math.min(1, (holdDuration + fadeDuration - age) / fadeDuration));
        for (const p of particles) {
          p.vx *= Math.pow(p.drag, dt); p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += p.spin * dt; p.sway += .07 * dt;
          if (p.y > height + 20) continue;
          context.save(); context.globalAlpha = opacity; context.translate(p.x + Math.sin(p.sway) * 5, p.y); context.rotate(p.rotation); context.fillStyle = p.color;
          if (p.round) { context.beginPath(); context.arc(0, 0, p.size * .35, 0, Math.PI * 2); context.fill(); }
          else { context.scale(1, .3 + Math.abs(Math.cos(p.sway)) * .7); context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
          context.restore();
        }
        if (age < holdDuration + fadeDuration) frame = requestAnimationFrame(draw);
        else context.clearRect(0, 0, width, height);
      }
      frame = requestAnimationFrame(draw);
    }
    let choice = Math.floor(Math.random() * (messages.length - (previous < 0 ? 0 : 1)));
    if (previous >= 0 && choice >= previous) choice++; previous = choice;
    active = { dispose }; resize();
    window.addEventListener('resize', resize); window.addEventListener('pagehide', dispose); document.addEventListener('visibilitychange', visibility); document.addEventListener('keydown', keydown);
    frame = requestAnimationFrame(() => {
      if (!alive) return;
      message.textContent = messages[choice]; stage.classList.add('visible'); burst();
      fadeTimer = setTimeout(() => stage.classList.remove('visible'), holdDuration);
      resetTimer = setTimeout(dispose, holdDuration + fadeDuration + 50);
    });
  }
  modules.MollyCelebration = { show, clear };
})();

// ---- end modules ----
function start() {
  if (!document.body || document.documentElement.hasAttribute('data-molly-userscript-version')) return;
  document.documentElement.setAttribute('data-molly-userscript-version', '1.3.0');
  const A = modules.MollyAdapter, UI = modules.MollyUI, Celebration = modules.MollyCelebration;
  let current = null, lastField = null, path = location.pathname + location.search + location.hash, queued = false;
  const buttons = new Map();
  function open(field) {
    if (current) return { ok: true };
    const all = A.targets();
    field = A.isTarget(field) ? field : A.isTarget(lastField) ? lastField : all.length === 1 ? all[0] : null;
    if (!field) return { ok: false, message: 'Click inside the editable “Clinical Actions, Intervention, and Methods” field, then try again. If there is no builder button, use a fictional note to report the field’s label.' };
    let session;
    try { session = A.capture(field); } catch (e) { return { ok: false, message: e.message }; }
    Celebration.clear();
    const host = document.createElement('div'); host.setAttribute('data-molly-builder', ''); document.documentElement.append(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    current = UI.mount(shadow, { hasSnippet: session.hasSnippet, onInsert: (note, mode) => session.insert(note, mode), onClose: inserted => { current = null; session = null; host.remove(); if (inserted) { try { Celebration.show(); } catch { Celebration.clear(); } } } });
    return { ok: true };
  }
  function scan() {
    queued = false;
    if (location.pathname + location.search + location.hash !== path) { current?.close(); Celebration.clear(); lastField = null; path = location.pathname + location.search + location.hash; }
    const found = A.targets();
    for (const [field, button] of buttons) if (!field.isConnected || !found.includes(field)) { button.remove(); buttons.delete(field); }
    for (const field of found) {
      if (buttons.get(field)?.isConnected) continue;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '✎ Note Builder'; button.setAttribute('data-molly-launch', ''); button.setAttribute('aria-label', 'Open Molly’s Note Builder for this clinical field');
      button.style.cssText = 'display:inline-flex;align-items:center;gap:5px;vertical-align:middle;margin:4px 6px;padding:6px 10px;border:1px solid #baaaca;border-radius:7px;background:#f4eff9;color:#513b69;font:600 12px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;cursor:pointer;';
      button.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(field); });
      const place = A.placement(field); place.parent.insertBefore(button, place.before); buttons.set(field, button);
    }
  }
  const observer = new MutationObserver(() => { if (!queued) { queued = true; setTimeout(scan, 200); } });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label','aria-labelledby','readonly','disabled','contenteditable'] });
  document.addEventListener('focusin', e => { if (A.isTarget(e.target)) lastField = e.target; });
  window.addEventListener('pagehide', () => { current?.close(); Celebration.clear(); lastField = null; });
  // This API receives a fixed menu title and callback only, never note text.
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Open Molly’s Note Builder', () => {
      const result = open(document.activeElement);
      if (!result.ok) window.alert(result.message);
    });
  }
  // SPA navigation can occur without an immediately relevant DOM mutation.
  setInterval(() => { if (location.pathname + location.search + location.hash !== path) scan(); }, 1000);
  scan();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
})();
