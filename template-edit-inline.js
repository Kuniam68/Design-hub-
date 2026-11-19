/* Isolated, in-place Edit Details for saved templates.
   Does not change Add to Prescription, Create New Template, New Prescription, or PDF generation. */
(function () {
  'use strict';
  const key = 'mediscript-shortcuts-v1';
  let active = null;

  function library() {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value)) throw new Error('The template library is unreadable.');
    return value;
  }
  function prescriptionOrigin(item) {
    return item.origin === 'prescription' || item.source === 'prescription' ||
      String(item.notes || '').startsWith('Saved from Prescription History') ||
      (!item.fullRecord && !item.editRecord);
  }
  function rows(data) {
    return (Array.isArray(data) ? data : []).map(entry =>
      Array.isArray(entry) ? entry.slice() :
      Array.isArray(entry && entry.values) ? entry.values.slice() : []
    ).filter(values => String(values[1] || '').trim());
  }
  function names(data) {
    return rows(data).map(values => String(values[1]).trim());
  }
  function renderedNames() {
    return Array.from(document.querySelectorAll('#med-container .med-item .m-name'))
      .map(field => String(field.value || '').trim()).filter(Boolean);
  }
  function validRecord(record) {
    return record && record.version === 1 && record.fields &&
      Array.isArray(record.medicines);
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function error(message, cause) {
    console.error('Template Edit Details:', cause || message);
    window.alert(message);
  }
  function endEdit() {
    if (!active) return;
    const previous = active;
    active = null;
    window.saveFullPrescriptionTemplate = previous.originalSave;
    window.setMediScriptTemplateMode?.(false);
    previous.saveButton.innerHTML = previous.originalHTML;
    previous.saveButton.title = previous.originalTitle;
    if (previous.printButton) {
      previous.printButton.hidden = previous.printHidden;
      previous.printButton.style.display = previous.printDisplay;
    }
    if (previous.banner) previous.banner.hidden = previous.bannerHidden;
  }

  // Existing New Prescription continues to work and also leaves Edit Details mode.
  window.addEventListener('mediscript-new-prescription', () => {
    if (active) endEdit();
  });

  function saveEditedTemplate() {
    if (!active || active.returnScheduled) return false;
    try {
      const record = window.getMediScriptPrescriptionSnapshot?.();
      if (!validRecord(record)) throw new Error('The editable prescription is unavailable.');
      const medicines = rows(record.medicines);
      if (!medicines.length) {
        throw new Error('No medicine names are present. The original template was not overwritten.');
      }
      const list = library();
      const index = list.findIndex(item => item && item.type === 'templates' && item.id === active.id);
      if (index < 0) throw new Error('The original template was not found. No duplicate was created.');
      const original = list[index];
      if (prescriptionOrigin(original) !== active.fromPrescription) {
        throw new Error('The template source has changed. The original was not overwritten.');
      }
      const updated = {
        ...original,
        medicines,
        advice: String(document.getElementById('advice')?.value || ''),
        created: Date.now()
      };
      const cleanRecord = copy(record);
      delete cleanRecord.editedFrom;
      if (active.fromPrescription && !original.fullRecord) {
        // Preserve Add to Prescription's original append-medicines behavior.
        updated.editRecord = cleanRecord;
      } else {
        updated.fullRecord = cleanRecord;
      }
      list[index] = updated;
      localStorage.setItem(key, JSON.stringify(list));
      active.returnScheduled = true;
      // downloadPDF already initiated the PDF download; let its finally block complete
      // before restoring the normal controls and opening the existing Template Portal.
      window.setTimeout(() => {
        endEdit();
        window.openMedicineLibrary?.();
      }, 900);
      return true;
    } catch (cause) {
      error('Save the Changes failed: ' + String(cause.message || cause) +
        '\nYour existing saved template has been preserved.', cause);
      return false;
    }
  }

  window.beginSavedTemplateEdit = async function beginSavedTemplateEdit(id) {
    const saveButton = document.getElementById('btnDownload');
    const printButton = document.querySelector('button[onclick="printPrescription()"]');
    const banner = document.getElementById('templateWorkspaceBanner');
    if (!saveButton || typeof window.restoreMediScriptPrescription !== 'function' ||
        typeof window.getMediScriptPrescriptionSnapshot !== 'function' ||
        typeof window.startNewPrescription !== 'function') {
      error('The prescription editor is not ready. Your template has not been changed.');
      return false;
    }
    try {
      const item = library().find(entry => entry && entry.type === 'templates' && entry.id === id);
      if (!item) throw new Error('The selected template is missing from this browser.');
      const record = validRecord(item.editRecord) ? item.editRecord :
        validRecord(item.fullRecord) ? item.fullRecord : null;
      const savedRows = rows(item.medicines);
      const recordRows = rows(record && record.medicines);
      const treatment = recordRows.length >= savedRows.length ? recordRows : savedRows;
      if (!treatment.length) {
        throw new Error('No saved medicines are available to restore. The template was not altered.');
      }
      const approved = await window.mediScriptConfirm(
        'Edit saved template?',
        'Open this template in the editable Prescription Portal? Any unsaved work currently in the prescription form will be replaced.',
        'Edit Details', false, 'Cancel');
      if (!approved) return false;

      if (active) endEdit();
      const priorPrescription = window.getMediScriptPrescriptionSnapshot();
      try {
        // Exactly the existing New Prescription workspace, without navigation or refresh.
        window.startNewPrescription(true);
        const editRecord = record ? copy(record) : window.getMediScriptPrescriptionSnapshot();
        editRecord.medicines = treatment.map(values => ({ values: values.slice() }));
        window.restoreMediScriptPrescription(editRecord);
        const expected = treatment.map(values => String(values[1]).trim());
        const actual = renderedNames();
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error('Not all saved medicine rows could be restored. Editing was cancelled to protect your template.');
        }
        if (!record) {
          const advice = document.getElementById('advice');
          if (advice) advice.value = String(item.advice || '');
          const diagnosis = document.getElementById('provDx');
          if (diagnosis && !diagnosis.value) diagnosis.value = String(item.name || '');
          window.updatePreview?.();
        }

        active = {
          id: item.id,
          fromPrescription: prescriptionOrigin(item),
          originalSave: window.saveFullPrescriptionTemplate,
          saveButton,
          originalHTML: saveButton.innerHTML,
          originalTitle: saveButton.title,
          printButton,
          printHidden: printButton?.hidden,
          printDisplay: printButton?.style.display,
          banner,
          bannerHidden: banner?.hidden,
          returnScheduled: false
        };
        window.setMediScriptTemplateMode?.(true, item.name);
        window.mediscriptTemplateId = item.id;
        saveButton.textContent = 'Save the Changes';
        saveButton.title = 'Download the PDF, update this saved template, and return to Templates & Favorites';
        if (printButton) { printButton.hidden = true; printButton.style.display = 'none'; }
        if (banner) banner.hidden = true;
        window.saveFullPrescriptionTemplate = saveEditedTemplate;
        const dialog = document.getElementById('medicineLibraryDialog');
        if (dialog?.open) dialog.close();
        document.querySelector('.form-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      } catch (cause) {
        endEdit();
        try { window.restoreMediScriptPrescription(priorPrescription); }
        catch (restoreError) { console.error('Restoring previous prescription:', restoreError); }
        throw cause;
      }
    } catch (cause) {
      error('Unable to open Edit Details: ' + String(cause.message || cause) +
        '\nYour saved template has not been changed.', cause);
      return false;
    }
  };
})();