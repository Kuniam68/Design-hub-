/* MediScript Pro — prescription-origin Edit Details only.
   Loaded exclusively when the normal prescription page has ?editPrescriptionTemplate=ID.
   No changes to New Prescription, Add to prescription, Create template, or regular PDF actions. */
(function () {
  'use strict';

  const id = new URLSearchParams(window.location.search).get('editPrescriptionTemplate');
  if (!id) return;

  const STORAGE_KEY = 'mediscript-shortcuts-v1';
  const TEMPLATE_PORTAL_URL = './index.html?openTemplates=1';
  let redirectQueued = false;

  function fail(message, error) {
    if (error) console.error('Prescription template edit failed:', error);
    window.alert(message);
  }

  function readTemplates() {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) throw new Error('Template library is not readable.');
    return parsed;
  }

  function isPrescriptionOrigin(item) {
    return Boolean(
      item &&
      item.type === 'templates' &&
      (
        item.origin === 'prescription' ||
        item.source === 'prescription' ||
        (typeof item.notes === 'string' && item.notes.startsWith('Saved from Prescription History')) ||
        !item.fullRecord
      )
    );
  }

  function initialize() {
    try {
      const templates = readTemplates();
      const template = templates.find(item => item && item.type === 'templates' && item.id === id);
      if (!template) throw new Error('The selected saved template was not found on this device.');

      // Create-New-Template items continue using their existing template editor.
      if (!isPrescriptionOrigin(template)) {
        window.location.replace('./template-editor.html?templateId=' +
          encodeURIComponent(template.id) + '&edit=1');
        return;
      }

      if (typeof window.getMediScriptPrescriptionSnapshot !== 'function' ||
          typeof window.restoreMediScriptPrescription !== 'function') {
        throw new Error('Prescription editing controls are unavailable.');
      }

      // Use the actual normal Prescription Portal, including its original editable fields.
      // Older prescription-history templates only retained medicines and advice, not a full
      // patient record. In that case start with an empty prescription and restore saved data.
      const sourceRecord = template.editRecord || template.fullRecord;
      let snapshot;
      if (sourceRecord &&
          sourceRecord.version === 1 &&
          sourceRecord.fields &&
          Array.isArray(sourceRecord.medicines)) {
        snapshot = JSON.parse(JSON.stringify(sourceRecord));
      } else {
        snapshot = window.getMediScriptPrescriptionSnapshot();
        snapshot.medicines = (Array.isArray(template.medicines) ? template.medicines : [])
          .map(item => ({
            values: Array.isArray(item) ? item.slice()
              : Array.isArray(item && item.values) ? item.values.slice() : []
          }));
      }

      window.restoreMediScriptPrescription(snapshot);

      if (!sourceRecord ||
          !sourceRecord.fields ||
          !Array.isArray(sourceRecord.medicines)) {
        const advice = document.getElementById('advice');
        if (advice && typeof template.advice === 'string') advice.value = template.advice;
        const diagnosis = document.getElementById('provDx');
        if (diagnosis && !diagnosis.value && template.name) diagnosis.value = template.name;
        if (typeof window.updatePreview === 'function') window.updatePreview();
      }

      // Edit-mode UI only: the normal Prescription Portal remains completely unchanged.
      const saveButton = document.getElementById('btnDownload');
      const printButton = document.querySelector('button[onclick="printPrescription()"]');
      if (!saveButton) throw new Error('PDF download button is missing.');
      if (printButton) printButton.remove();
      saveButton.textContent = 'Save the Changes';
      saveButton.title = 'Download PDF, save changes to this template, and return to Templates & Favorites';

      // Reuse the existing unchanged downloadPDF() pathway, which calls
      // window.saveFullPrescriptionTemplate after generating/downloading the PDF.
      // This prevents the edit from being saved into patient Prescription History.
      window.mediscriptTemplateMode = true;
      window.mediscriptTemplateId = id;
      window.mediscriptTemplateName = template.name || 'Saved template';
      document.getElementById('templateWorkspaceBanner')?.setAttribute('hidden', '');

      window.saveFullPrescriptionTemplate = function saveEditedPrescriptionTemplate() {
        try {
          const record = window.getMediScriptPrescriptionSnapshot();
          if (!record || !Array.isArray(record.medicines) || !record.fields) {
            throw new Error('The edited prescription is not ready.');
          }
          const saved = readTemplates();
          const index = saved.findIndex(item => item && item.type === 'templates' && item.id === id);
          if (index === -1) {
            throw new Error('Original template not found. Your changes were not saved as a duplicate.');
          }
          if (!isPrescriptionOrigin(saved[index])) {
            throw new Error('Template type has changed. Refusing to overwrite this template.');
          }

          const updated = {
            ...saved[index],
            origin: 'prescription',
            medicines: record.medicines.map(item =>
              Array.isArray(item) ? item.slice() :
              Array.isArray(item && item.values) ? item.values.slice() : []
            ),
            advice: String(document.getElementById('advice')?.value || ''),
            created: Date.now()
          };
          // Preserve the original Add to prescription path: templates that lacked
          // fullRecord must continue to append medicines, not replace a prescription.
          if (saved[index].fullRecord) updated.fullRecord = JSON.parse(JSON.stringify(record));
          else updated.editRecord = JSON.parse(JSON.stringify(record));
          // Keep the original template name and notes; user edits change the
          // clinical content, not the saved item's identity or provenance.
          saved[index] = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

          // The original download has already been triggered. Return to the
          // library after a short browser-safe handoff for the PDF download.
          if (!redirectQueued) {
            redirectQueued = true;
            window.setTimeout(() => window.location.assign(TEMPLATE_PORTAL_URL), 700);
          }
          return true;
        } catch (error) {
          fail('Could not save changes. The existing template has not been replaced. ' +
            'Please check browser storage and retry.', error);
          return false;
        }
      };
    } catch (error) {
      fail('Unable to open Edit Details: ' + String(error.message || error) +
        '\n\nYour existing templates have not been changed.', error);
      window.location.replace(TEMPLATE_PORTAL_URL);
    }
  }

  // window.onload initializes the normal editable prescription first.
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, {once: true});
})();