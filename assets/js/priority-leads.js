const PRIORITY_OBJECTS = {
  "Просторная 4А": "prostornaya-4a",
  "Аэродромная 18Г": "aerodromnaya-18g",
  "Сенная 76": "sennaya-76",
  "Общий подбор новостройки": "all-newbuilds"
};

const PRIORITY_OBJECT_ALIASES = {
  "prostornaya-4a": "Просторная 4А",
  "просторная-4а": "Просторная 4А",
  "просторная 4а": "Просторная 4А",
  "aerodromnaya-18g": "Аэродромная 18Г",
  "аэродромная-18г": "Аэродромная 18Г",
  "аэродромная 18г": "Аэродромная 18Г",
  "sennaya-76": "Сенная 76",
  "сенная-76": "Сенная 76",
  "сенная 76": "Сенная 76",
  "all-newbuilds": "Общий подбор новостройки",
  "all": "Общий подбор новостройки"
};

function normalizeObjectQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function getRequestedObjectName() {
  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get("object") || params.get("project") || params.get("complex");
  if (!rawValue) return "";

  const normalized = normalizeObjectQuery(rawValue);
  return PRIORITY_OBJECT_ALIASES[normalized] || "";
}

function ensureHiddenObjectId(form) {
  let hidden = form.querySelector("input[name='residential_complex_id']");
  if (hidden) return hidden;

  hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = "residential_complex_id";
  form.prepend(hidden);
  return hidden;
}

function updateRequestedObjectNote(objectName) {
  const note = document.querySelector("[data-selected-object-note]");
  if (!note) return;

  if (!objectName || objectName === "Общий подбор новостройки") {
    note.hidden = true;
    note.textContent = "";
    return;
  }

  note.textContent = `Вы перешли к предварительному расчёту по объекту «${objectName}». Он уже выбран в форме. Цена, наличие и возможность применения программы уточняются отдельно на дату консультации.`;
  note.hidden = false;
}

function enhancePriorityObjectForm(form) {
  const select = form.querySelector("select[name='residential_complex']");
  if (!select) return;

  const requestedObject = getRequestedObjectName();

  if (requestedObject && Array.from(select.options).some((option) => option.value === requestedObject)) {
    select.value = requestedObject;
  }

  const syncObject = () => {
    const objectName = select.value.trim();
    // Reference cards create a temporary option and their own verified object id.
    // Re-resolve the field on every change: reference cleanup may remove its prior input.
    const referenceId = select.selectedOptions[0]?.hasAttribute("data-reference-option")
      ? String(form.querySelector('input[name="reference_object_id"]')?.value || "").trim()
      : "";
    const objectId = referenceId ? `reference:${referenceId}` : (PRIORITY_OBJECTS[objectName] || "");
    const hiddenId = ensureHiddenObjectId(form);

    hiddenId.value = objectId;
    form.dataset.complex = objectName || "Общий подбор новостройки";
    form.dataset.complexId = objectId;
  };

  select.addEventListener("change", syncObject);
  syncObject();
  updateRequestedObjectNote(requestedObject);
}

document.querySelectorAll("form[data-lead-form]").forEach(enhancePriorityObjectForm);